import { PitchCorrector, type PitchCorrectionParams } from './pitch-correction';
import type { EffectsChain } from './effects-chain';
import type { NoteName } from './music-theory';

export interface EngineState {
  isRunning: boolean;
  isMicActive: boolean;
  currentFrequency: number;
  currentClarity: number;
  correctedFrequency: number;
  currentMidi: number;
  correctedMidi: number;
  targetMidi: number;
  shiftCents: number;
  inputLevel: number;
  outputLevel: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private pitchDetectorNode: AudioWorkletNode | null = null;
  private pitchShifterNode: AudioWorkletNode | null = null;
  private inputGain: GainNode | null = null;
  private outputGain: GainNode | null = null;
  private dryWetMix: GainNode | null = null;

  private pitchCorrector = new PitchCorrector();
  private pitchBuffer = new Float32Array(2048);
  private lastDetectedFreq = 0;
  private lastClarity = 0;
  private lastCorrectedMidi = 0;
  private lastTargetMidi = 0;
  private lastShiftCents = 0;
  private lastTime = 0;

  private _onPitchData: ((data: { freq: number; clarity: number; midi: number; correctedMidi: number; targetMidi: number; shiftCents: number }) => void) | null = null;

  correctionParams: PitchCorrectionParams = {
    key: 'C',
    scale: 'chromatic',
    retuneSpeed: 50,
    humanize: 0,
    amount: 100,
    enabled: true,
  };

  get audioContext(): AudioContext | null {
    return this.ctx;
  }

  get isRunning(): boolean {
    return this.ctx?.state === 'running';
  }

  set onPitchData(cb: ((data: { freq: number; clarity: number; midi: number; correctedMidi: number; targetMidi: number; shiftCents: number }) => void) | null) {
    this._onPitchData = cb;
  }

  async init(): Promise<void> {
    if (this.ctx) return;

    this.ctx = new AudioContext({ sampleRate: 44100 });

    // Load worklets
    try {
      await this.ctx.audioWorklet.addModule('/worklets/pitch-detector-worklet.js');
      await this.ctx.audioWorklet.addModule('/worklets/pitch-shifter-worklet.js');
    } catch (e) {
      console.warn('AudioWorklet loading failed, using fallback:', e);
    }

    // Create nodes
    this.inputGain = this.ctx.createGain();
    this.outputGain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    // Pitch detector worklet
    try {
      this.pitchDetectorNode = new AudioWorkletNode(this.ctx, 'pitch-detector-processor');
      this.pitchDetectorNode.port.onmessage = (e) => {
        if (e.data.type === 'pitch') {
          this.handlePitchData(e.data.frequency, e.data.clarity);
        }
      };
    } catch {
      console.warn('Pitch detector worklet unavailable');
    }

    // Pitch shifter worklet
    try {
      this.pitchShifterNode = new AudioWorkletNode(this.ctx, 'pitch-shifter-processor', {
        outputChannelCount: [1],
      });
    } catch {
      console.warn('Pitch shifter worklet unavailable');
    }

    this.lastTime = performance.now() / 1000;
  }

  private handlePitchData(freq: number, clarity: number): void {
    this.lastDetectedFreq = freq;
    this.lastClarity = clarity;

    const now = performance.now() / 1000;
    const dt = now - this.lastTime;
    this.lastTime = now;

    if (freq > 0 && clarity > 0.85) {
      const result = this.pitchCorrector.correct(freq, this.correctionParams, dt);
      this.lastCorrectedMidi = result.correctedMidi;
      this.lastTargetMidi = result.targetMidi;
      this.lastShiftCents = result.shiftCents;

      // Send shift amount to pitch shifter worklet
      if (this.pitchShifterNode) {
        this.pitchShifterNode.port.postMessage({ type: 'shift', cents: result.shiftCents });
      }

      this._onPitchData?.({
        freq,
        clarity,
        midi: result.correctedMidi - result.shiftCents / 100,
        correctedMidi: result.correctedMidi,
        targetMidi: result.targetMidi,
        shiftCents: result.shiftCents,
      });
    } else {
      this._onPitchData?.({
        freq: 0,
        clarity,
        midi: 0,
        correctedMidi: 0,
        targetMidi: 0,
        shiftCents: 0,
      });
    }
  }

  async startMic(): Promise<void> {
    if (!this.ctx) await this.init();
    if (!this.ctx) throw new Error('AudioContext not initialized');

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    this.micSource = this.ctx.createMediaStreamSource(this.micStream);

    // Wire signal chain: mic -> inputGain -> [detector] -> shifter -> outputGain -> destination
    this.micSource.connect(this.inputGain!);

    if (this.pitchDetectorNode) {
      this.inputGain!.connect(this.pitchDetectorNode);
      // Detector doesn't output audio — it just analyzes
    }

    if (this.pitchShifterNode) {
      this.inputGain!.connect(this.pitchShifterNode);
      this.pitchShifterNode.connect(this.outputGain!);
    } else {
      // Fallback: pass through directly
      this.inputGain!.connect(this.outputGain!);
    }

    this.inputGain!.connect(this.analyser!);
    this.outputGain!.connect(this.ctx.destination);

    // If no worklet detector, start analyser-based fallback
    if (!this.pitchDetectorNode) {
      this.startFallbackDetection();
    }
  }

  private fallbackInterval: number | null = null;

  private startFallbackDetection(): void {
    if (!this.analyser || !this.ctx) return;

    const bufferLength = this.analyser.fftSize;
    const buffer = new Float32Array(bufferLength);

    const detect = () => {
      this.analyser!.getFloatTimeDomainData(buffer);

      // Simple autocorrelation pitch detection
      const { freq, clarity } = this.autoCorrelate(buffer, this.ctx!.sampleRate);
      this.handlePitchData(freq, clarity);
    };

    this.fallbackInterval = window.setInterval(detect, 1000 / 60); // ~60fps
  }

  private autoCorrelate(buffer: Float32Array, sampleRate: number): { freq: number; clarity: number } {
    // Check for signal level
    let rms = 0;
    for (let i = 0; i < buffer.length; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / buffer.length);
    if (rms < 0.01) return { freq: 0, clarity: 0 };

    const halfLen = Math.floor(buffer.length / 2);
    const yinBuf = new Float32Array(halfLen);

    // Difference function
    for (let tau = 0; tau < halfLen; tau++) {
      let sum = 0;
      for (let i = 0; i < halfLen; i++) {
        const delta = buffer[i] - buffer[i + tau];
        sum += delta * delta;
      }
      yinBuf[tau] = sum;
    }

    // CMND
    yinBuf[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < halfLen; tau++) {
      runningSum += yinBuf[tau];
      yinBuf[tau] *= tau / runningSum;
    }

    // Threshold
    const threshold = 0.15;
    let tauEst = -1;
    for (let tau = 2; tau < halfLen; tau++) {
      if (yinBuf[tau] < threshold) {
        while (tau + 1 < halfLen && yinBuf[tau + 1] < yinBuf[tau]) tau++;
        tauEst = tau;
        break;
      }
    }

    if (tauEst === -1) return { freq: 0, clarity: 0 };

    // Parabolic interpolation
    const s0 = tauEst > 0 ? yinBuf[tauEst - 1] : yinBuf[tauEst];
    const s1 = yinBuf[tauEst];
    const s2 = tauEst + 1 < halfLen ? yinBuf[tauEst + 1] : yinBuf[tauEst];

    let betterTau = tauEst;
    const denom = 2 * s1 - s2 - s0;
    if (denom !== 0) {
      betterTau = tauEst + (s2 - s0) / (2 * denom);
    }

    return {
      freq: sampleRate / betterTau,
      clarity: 1 - s1,
    };
  }

  stopMic(): void {
    if (this.fallbackInterval !== null) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }

    this.micSource?.disconnect();
    this.pitchDetectorNode?.disconnect();
    this.pitchShifterNode?.disconnect();
    this.inputGain?.disconnect();
    this.outputGain?.disconnect();

    this.micStream?.getTracks().forEach(t => t.stop());
    this.micStream = null;
    this.micSource = null;

    this.pitchCorrector.reset();
  }

  async destroy(): Promise<void> {
    this.stopMic();
    await this.ctx?.close();
    this.ctx = null;
  }

  setInputGain(value: number): void {
    if (this.inputGain) this.inputGain.gain.value = value;
  }

  setOutputGain(value: number): void {
    if (this.outputGain) this.outputGain.gain.value = value;
  }

  getInputLevel(): number {
    if (!this.analyser) return 0;
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length);
  }

  getState(): EngineState {
    return {
      isRunning: this.isRunning,
      isMicActive: this.micStream !== null,
      currentFrequency: this.lastDetectedFreq,
      currentClarity: this.lastClarity,
      correctedFrequency: this.lastCorrectedMidi > 0 ? 440 * Math.pow(2, (this.lastCorrectedMidi - 69) / 12) : 0,
      currentMidi: this.lastDetectedFreq > 0 ? 69 + 12 * Math.log2(this.lastDetectedFreq / 440) : 0,
      correctedMidi: this.lastCorrectedMidi,
      targetMidi: this.lastTargetMidi,
      shiftCents: this.lastShiftCents,
      inputLevel: this.getInputLevel(),
      outputLevel: 0,
    };
  }
}

// Singleton
let engineInstance: AudioEngine | null = null;

export function getEngine(): AudioEngine {
  if (!engineInstance) {
    engineInstance = new AudioEngine();
  }
  return engineInstance;
}
