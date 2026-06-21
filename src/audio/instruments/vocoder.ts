import * as Tone from 'tone';
import { InstrumentBase, midiToToneNote, normalizeVelocity } from './instrument-base';

export interface VocoderPreset {
  numBands: number;           // Number of frequency bands (8-32)
  lowFreq: number;            // Lowest frequency
  highFreq: number;           // Highest frequency
  attack: number;             // Envelope follower attack
  release: number;            // Envelope follower release
  carrierType: 'sawtooth' | 'square' | 'pulse' | 'noise';
  carrierMix: number;         // Mix of carrier voices (for unison)
  sibilance: number;          // High frequency boost for clarity
  formantShift: number;       // Shift formants up/down (-12 to 12 semitones)
  wet: number;                // Dry/wet mix
}

const DEFAULT_PRESET: VocoderPreset = {
  numBands: 16,
  lowFreq: 100,
  highFreq: 8000,
  attack: 0.005,
  release: 0.05,
  carrierType: 'sawtooth',
  carrierMix: 1,
  sibilance: 0.3,
  formantShift: 0,
  wet: 1,
};

export const VOCODER_PRESETS: Record<string, Partial<VocoderPreset>> = {
  'Classic Robot': DEFAULT_PRESET,
  'Soft Robot': {
    numBands: 12,
    attack: 0.01,
    release: 0.1,
    carrierType: 'sawtooth',
    sibilance: 0.2,
  },
  'Talk Box': {
    numBands: 24,
    attack: 0.003,
    release: 0.03,
    carrierType: 'square',
    sibilance: 0.5,
  },
  'Whisper': {
    numBands: 16,
    attack: 0.01,
    release: 0.15,
    carrierType: 'noise',
    sibilance: 0.6,
  },
  'Choir': {
    numBands: 20,
    attack: 0.02,
    release: 0.1,
    carrierType: 'sawtooth',
    carrierMix: 0.7,
    sibilance: 0.3,
  },
  'Telephone': {
    numBands: 8,
    lowFreq: 300,
    highFreq: 3400,
    attack: 0.005,
    release: 0.05,
    carrierType: 'square',
  },
  'Deep Voice': {
    numBands: 16,
    formantShift: -5,
    attack: 0.005,
    release: 0.05,
    carrierType: 'sawtooth',
  },
  'Chipmunk': {
    numBands: 16,
    formantShift: 8,
    attack: 0.003,
    release: 0.03,
    carrierType: 'sawtooth',
  },
};

/**
 * Vocoder
 * Creates robotic/synthetic voice effects by modulating a carrier signal
 * with the spectral characteristics of a modulator (voice)
 */
export class Vocoder extends InstrumentBase {
  type: 'synth' = 'synth';

  private carrierSynth: Tone.PolySynth;
  private noiseSynth: Tone.Noise;
  private modulatorInput: Tone.Gain;
  private carrierGain: Tone.Gain;
  private outputMix: Tone.Gain;
  private dryGain: Tone.Gain;
  private wetGain: Tone.Gain;

  // Band filters and envelopes
  private analysisBands: Tone.Filter[] = [];
  private synthesisBands: Tone.Filter[] = [];
  private envelopeFollowers: Tone.Follower[] = [];
  private bandGains: Tone.Gain[] = [];

  // Sibilance detection (high frequencies)
  private sibilanceFilter: Tone.Filter;
  private sibilanceFollower: Tone.Follower;
  private sibilanceGain: Tone.Gain;

  private preset: VocoderPreset;
  private isModulatorConnected: boolean = false;
  private noiseStarted: boolean = false;

  constructor(name = 'Vocoder') {
    super(name);
    this.preset = { ...DEFAULT_PRESET };

    // Carrier synth (what provides the pitch)
    // Note: 'noise' type is handled separately via noiseSynth
    const oscType = this.preset.carrierType === 'noise' ? 'sawtooth' : this.preset.carrierType;
    this.carrierSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: oscType },
      envelope: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.3 },
    });

    // Noise source (alternative carrier)
    this.noiseSynth = new Tone.Noise('white');

    // Modulator input (for voice)
    this.modulatorInput = new Tone.Gain(1);

    // Carrier mixing
    this.carrierGain = new Tone.Gain(1);

    // Output mixing
    this.outputMix = new Tone.Gain(1);
    this.dryGain = new Tone.Gain(1 - this.preset.wet);
    this.wetGain = new Tone.Gain(this.preset.wet);

    // Sibilance chain (preserves high frequency detail)
    this.sibilanceFilter = new Tone.Filter({
      type: 'highpass',
      frequency: 5000,
    });
    this.sibilanceFollower = new Tone.Follower(0.01);
    this.sibilanceGain = new Tone.Gain(this.preset.sibilance);

    // Create filter bands
    this.createBands();

    // Connect carrier synth
    this.carrierSynth.connect(this.carrierGain);

    // Connect noise synth (muted by default, started on first trigger)
    const noiseGain = new Tone.Gain(0);
    this.noiseSynth.connect(noiseGain);
    noiseGain.connect(this.carrierGain);
    // Don't start noise here - it will be started on first trigger

    // Connect sibilance path
    this.modulatorInput.connect(this.sibilanceFilter);
    this.sibilanceFilter.connect(this.sibilanceFollower);
    this.sibilanceFollower.connect(this.sibilanceGain);
    this.sibilanceGain.connect(this.outputMix);

    // Connect dry path (original modulator signal)
    this.modulatorInput.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Connect wet path
    this.outputMix.connect(this.wetGain);
    this.wetGain.connect(this.output);
  }

  private createBands(): void {
    // Clear existing bands
    this.disposeBands();

    const { numBands, lowFreq, highFreq, attack, release } = this.preset;

    // Calculate frequencies using logarithmic spacing
    const logLow = Math.log10(lowFreq);
    const logHigh = Math.log10(highFreq);
    const logStep = (logHigh - logLow) / numBands;

    for (let i = 0; i < numBands; i++) {
      const freq = Math.pow(10, logLow + (i + 0.5) * logStep);
      const bandwidth = Math.pow(10, logStep) - 1;

      // Analysis filter (for modulator/voice)
      const analysisFilter = new Tone.Filter({
        type: 'bandpass',
        frequency: freq,
        Q: 1 / bandwidth,
      });

      // Envelope follower (smoothing controls response time)
      const follower = new Tone.Follower(attack + release);

      // Synthesis filter (for carrier)
      const synthesisFilter = new Tone.Filter({
        type: 'bandpass',
        frequency: freq,
        Q: 1 / bandwidth,
      });

      // Band gain (controlled by envelope follower)
      const bandGain = new Tone.Gain(0);

      // Connect analysis chain
      this.modulatorInput.connect(analysisFilter);
      analysisFilter.connect(follower);
      follower.connect(bandGain.gain);

      // Connect synthesis chain
      this.carrierGain.connect(synthesisFilter);
      synthesisFilter.connect(bandGain);
      bandGain.connect(this.outputMix);

      this.analysisBands.push(analysisFilter);
      this.envelopeFollowers.push(follower);
      this.synthesisBands.push(synthesisFilter);
      this.bandGains.push(bandGain);
    }
  }

  private disposeBands(): void {
    this.analysisBands.forEach(f => f.dispose());
    this.synthesisBands.forEach(f => f.dispose());
    this.envelopeFollowers.forEach(f => f.dispose());
    this.bandGains.forEach(g => g.dispose());

    this.analysisBands = [];
    this.synthesisBands = [];
    this.envelopeFollowers = [];
    this.bandGains = [];
  }

  /**
   * Connect a modulator source (voice input)
   */
  connectModulator(source: Tone.ToneAudioNode): void {
    source.connect(this.modulatorInput);
    this.isModulatorConnected = true;
  }

  /**
   * Get the modulator input for external connection
   */
  getModulatorInput(): Tone.Gain {
    return this.modulatorInput;
  }

  /**
   * Set the carrier type
   */
  setCarrierType(type: 'sawtooth' | 'square' | 'pulse' | 'noise'): void {
    this.preset.carrierType = type;

    if (type === 'noise') {
      // Use noise as carrier
      this.carrierSynth.volume.value = -Infinity;
      // Noise is already connected
    } else {
      this.carrierSynth.set({
        oscillator: { type: type === 'pulse' ? 'square' : type },
      });
      this.carrierSynth.volume.value = 0;
    }
  }

  /**
   * Set formant shift
   */
  setFormantShift(semitones: number): void {
    this.preset.formantShift = semitones;
    // Shift all synthesis band frequencies
    const shiftRatio = Math.pow(2, semitones / 12);

    this.synthesisBands.forEach((filter, i) => {
      const originalFreq = this.analysisBands[i].frequency.value;
      filter.frequency.value = (originalFreq as number) * shiftRatio;
    });
  }

  /**
   * Set sibilance amount
   */
  setSibilance(amount: number): void {
    this.preset.sibilance = amount;
    this.sibilanceGain.gain.value = amount;
  }

  triggerAttack(note: string | number, time?: number, velocity = 100): void {
    // Start noise synth on first trigger if using noise carrier
    if (!this.noiseStarted && this.preset.carrierType === 'noise') {
      try {
        this.noiseSynth.start();
        this.noiseStarted = true;
      } catch (e) {
        // Audio context may not be ready
      }
    }
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = normalizeVelocity(velocity);
    this.carrierSynth.triggerAttack(noteStr, time, vel);
  }

  triggerRelease(note: string | number, time?: number): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    this.carrierSynth.triggerRelease(noteStr, time);
  }

  triggerAttackRelease(
    note: string | number,
    duration: number | string,
    time?: number,
    velocity = 100
  ): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = normalizeVelocity(velocity);
    this.carrierSynth.triggerAttackRelease(noteStr, duration, time, vel);
  }

  releaseAll(time?: number): void {
    this.carrierSynth.releaseAll(time);
  }

  loadPreset(params: Record<string, unknown>): void {
    const newPreset = { ...DEFAULT_PRESET, ...params as Partial<VocoderPreset> };

    // Check if bands need to be recreated
    const needsRebuild = newPreset.numBands !== this.preset.numBands ||
      newPreset.lowFreq !== this.preset.lowFreq ||
      newPreset.highFreq !== this.preset.highFreq;

    this.preset = newPreset;

    if (needsRebuild) {
      this.createBands();
    }

    // Update envelope followers (smoothing = attack + release)
    this.envelopeFollowers.forEach(f => {
      f.smoothing = this.preset.attack + this.preset.release;
    });

    this.setCarrierType(this.preset.carrierType);
    this.setFormantShift(this.preset.formantShift);
    this.setSibilance(this.preset.sibilance);

    this.dryGain.gain.value = 1 - this.preset.wet;
    this.wetGain.gain.value = this.preset.wet;
  }

  getPreset(): Record<string, unknown> {
    return { ...this.preset };
  }

  dispose(): void {
    this.disposeBands();
    this.carrierSynth.dispose();
    this.noiseSynth.dispose();
    this.modulatorInput.dispose();
    this.carrierGain.dispose();
    this.outputMix.dispose();
    this.dryGain.dispose();
    this.wetGain.dispose();
    this.sibilanceFilter.dispose();
    this.sibilanceFollower.dispose();
    this.sibilanceGain.dispose();
    super.dispose();
  }
}
