import * as Tone from 'tone';
import { InstrumentBase, midiToToneNote, normalizeVelocity } from './instrument-base';

export interface SubBass808Preset {
  // Oscillator
  waveform: 'sine' | 'triangle';

  // Pitch envelope (the classic 808 "boom")
  pitchDecay: number;
  pitchAmount: number; // Semitones to drop

  // Amp envelope
  attack: number;
  decay: number;
  sustain: number;
  release: number;

  // Tone shaping
  click: number; // Attack transient amount
  drive: number; // Saturation/distortion
  tone: number;  // Low-pass filter frequency

  // Output
  boost: number; // Sub-frequency boost
}

const DEFAULT_PRESET: SubBass808Preset = {
  waveform: 'sine',
  pitchDecay: 0.08,
  pitchAmount: 12,
  attack: 0.001,
  decay: 0.5,
  sustain: 0.2,
  release: 0.8,
  click: 0.3,
  drive: 0,
  tone: 800,
  boost: 0,
};

export const SUB_BASS_808_PRESETS: Record<string, Partial<SubBass808Preset>> = {
  'Classic 808': DEFAULT_PRESET,
  'Deep Sub': {
    waveform: 'sine',
    pitchDecay: 0.15,
    pitchAmount: 24,
    decay: 1.0,
    sustain: 0.1,
    release: 1.2,
    click: 0.1,
    drive: 0,
    tone: 400,
    boost: 3,
  },
  'Punchy 808': {
    waveform: 'sine',
    pitchDecay: 0.05,
    pitchAmount: 8,
    decay: 0.3,
    sustain: 0.3,
    release: 0.5,
    click: 0.6,
    drive: 0.2,
    tone: 1200,
  },
  'Trap 808': {
    waveform: 'sine',
    pitchDecay: 0.1,
    pitchAmount: 18,
    decay: 0.8,
    sustain: 0.15,
    release: 1.5,
    click: 0.4,
    drive: 0.3,
    tone: 600,
    boost: 2,
  },
  'Distorted 808': {
    waveform: 'triangle',
    pitchDecay: 0.06,
    pitchAmount: 10,
    decay: 0.4,
    sustain: 0.25,
    release: 0.6,
    click: 0.5,
    drive: 0.7,
    tone: 2000,
  },
  'Long Tail': {
    waveform: 'sine',
    pitchDecay: 0.12,
    pitchAmount: 15,
    decay: 2.0,
    sustain: 0.05,
    release: 2.5,
    click: 0.2,
    drive: 0.1,
    tone: 500,
    boost: 4,
  },
  'Short Thump': {
    waveform: 'sine',
    pitchDecay: 0.03,
    pitchAmount: 6,
    decay: 0.15,
    sustain: 0,
    release: 0.2,
    click: 0.8,
    drive: 0.1,
    tone: 1500,
  },
  'Saturated Sub': {
    waveform: 'triangle',
    pitchDecay: 0.08,
    pitchAmount: 12,
    decay: 0.6,
    sustain: 0.2,
    release: 0.8,
    click: 0.3,
    drive: 0.5,
    tone: 1000,
    boost: 2,
  },
};

export class SubBass808 extends InstrumentBase {
  type: 'bass' = 'bass';

  private osc: Tone.Oscillator;
  private pitchEnv: Tone.Envelope;
  private ampEnv: Tone.AmplitudeEnvelope;
  private clickOsc: Tone.Oscillator;
  private clickEnv: Tone.Envelope;
  private filter: Tone.Filter;
  private distortion: Tone.Distortion;
  private subBoost: Tone.Filter;
  private preset: SubBass808Preset;
  private baseFreq: number = 55;

  constructor(name = '808 Sub Bass') {
    super(name);
    this.preset = { ...DEFAULT_PRESET };

    // Main oscillator
    this.osc = new Tone.Oscillator({
      type: this.preset.waveform,
      frequency: this.baseFreq,
    });

    // Pitch envelope for the "boom" drop
    this.pitchEnv = new Tone.Envelope({
      attack: 0.001,
      decay: this.preset.pitchDecay,
      sustain: 0,
      release: 0.01,
    });

    // Connect pitch envelope to oscillator frequency
    const pitchScale = new Tone.Multiply(this.preset.pitchAmount * 100);
    this.pitchEnv.connect(pitchScale);
    pitchScale.connect(this.osc.detune);

    // Amplitude envelope
    this.ampEnv = new Tone.AmplitudeEnvelope({
      attack: this.preset.attack,
      decay: this.preset.decay,
      sustain: this.preset.sustain,
      release: this.preset.release,
    });

    // Click oscillator for attack transient
    this.clickOsc = new Tone.Oscillator({
      type: 'sine',
      frequency: 1000,
    });

    this.clickEnv = new Tone.Envelope({
      attack: 0.001,
      decay: 0.02,
      sustain: 0,
      release: 0.01,
    });

    const clickGain = new Tone.Gain(this.preset.click);
    this.clickEnv.connect(clickGain.gain);

    // Filter for tone shaping
    this.filter = new Tone.Filter({
      type: 'lowpass',
      frequency: this.preset.tone,
      rolloff: -24,
    });

    // Distortion/saturation
    this.distortion = new Tone.Distortion({
      distortion: this.preset.drive,
      wet: this.preset.drive > 0 ? 1 : 0,
    });

    // Sub-frequency boost (low shelf)
    this.subBoost = new Tone.Filter({
      type: 'lowshelf',
      frequency: 80,
      gain: this.preset.boost,
    });

    // Connect main signal chain
    this.osc.connect(this.ampEnv);
    this.ampEnv.connect(this.filter);

    // Connect click
    this.clickOsc.connect(clickGain);
    clickGain.connect(this.filter);

    // Filter -> Distortion -> SubBoost -> Output
    this.filter.connect(this.distortion);
    this.distortion.connect(this.subBoost);
    this.subBoost.connect(this.output);

    // Start oscillators (they're silent until envelopes trigger)
    this.osc.start();
    this.clickOsc.start();
  }

  triggerAttack(note: string | number, time?: number, velocity = 100): void {
    const t = time ?? Tone.now();
    const vel = normalizeVelocity(velocity);

    // Get frequency from note
    if (typeof note === 'number') {
      this.baseFreq = Tone.Frequency(midiToToneNote(note)).toFrequency();
    } else {
      this.baseFreq = Tone.Frequency(note).toFrequency();
    }

    // Set oscillator to pitch-enveloped start frequency
    const startFreq = this.baseFreq * Math.pow(2, this.preset.pitchAmount / 12);
    this.osc.frequency.setValueAtTime(startFreq, t);
    this.osc.frequency.exponentialRampToValueAtTime(this.baseFreq, t + this.preset.pitchDecay);

    // Trigger envelopes
    this.pitchEnv.triggerAttack(t);
    this.ampEnv.triggerAttack(t, vel);
    this.clickEnv.triggerAttack(t);
  }

  triggerRelease(_note: string | number, time?: number): void {
    const t = time ?? Tone.now();
    this.ampEnv.triggerRelease(t);
    this.pitchEnv.triggerRelease(t);
  }

  triggerAttackRelease(
    note: string | number,
    duration: number | string,
    time?: number,
    velocity = 100
  ): void {
    const t = time ?? Tone.now();
    const dur = Tone.Time(duration).toSeconds();

    this.triggerAttack(note, t, velocity);
    this.triggerRelease(note, t + dur);
  }

  releaseAll(time?: number): void {
    const t = time ?? Tone.now();
    this.ampEnv.triggerRelease(t);
    this.pitchEnv.triggerRelease(t);
  }

  // 808-specific controls
  setPitchDecay(time: number): void {
    this.preset.pitchDecay = time;
    this.pitchEnv.decay = time;
  }

  setDrive(amount: number): void {
    this.preset.drive = amount;
    this.distortion.distortion = amount;
    this.distortion.wet.value = amount > 0 ? 1 : 0;
  }

  setTone(frequency: number): void {
    this.preset.tone = frequency;
    this.filter.frequency.value = frequency;
  }

  setBoost(db: number): void {
    this.preset.boost = db;
    this.subBoost.gain.value = db;
  }

  loadPreset(params: Record<string, unknown>): void {
    this.preset = { ...DEFAULT_PRESET, ...params as Partial<SubBass808Preset> };

    this.osc.type = this.preset.waveform;
    this.pitchEnv.decay = this.preset.pitchDecay;

    this.ampEnv.set({
      attack: this.preset.attack,
      decay: this.preset.decay,
      sustain: this.preset.sustain,
      release: this.preset.release,
    });

    this.filter.frequency.value = this.preset.tone;
    this.distortion.distortion = this.preset.drive;
    this.distortion.wet.value = this.preset.drive > 0 ? 1 : 0;
    this.subBoost.gain.value = this.preset.boost;
  }

  getPreset(): Record<string, unknown> {
    return { ...this.preset };
  }

  dispose(): void {
    this.osc.dispose();
    this.pitchEnv.dispose();
    this.ampEnv.dispose();
    this.clickOsc.dispose();
    this.clickEnv.dispose();
    this.filter.dispose();
    this.distortion.dispose();
    this.subBoost.dispose();
    super.dispose();
  }
}
