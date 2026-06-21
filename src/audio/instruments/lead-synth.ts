import * as Tone from 'tone';
import { InstrumentBase, midiToToneNote, normalizeVelocity } from './instrument-base';

export interface LeadSynthPreset {
  oscillatorType: 'sine' | 'sawtooth' | 'square' | 'triangle' | 'pwm';
  pulseWidth?: number; // For PWM
  filterFrequency: number;
  filterResonance: number;
  filterEnvelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    amount: number; // How much the envelope affects the filter
  };
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  portamento: number; // Glide time
  vibrato: {
    frequency: number;
    depth: number;
  };
  distortion: number;
  delay: {
    time: number;
    feedback: number;
    wet: number;
  };
}

const DEFAULT_PRESET: LeadSynthPreset = {
  oscillatorType: 'sawtooth',
  filterFrequency: 3000,
  filterResonance: 2,
  filterEnvelope: {
    attack: 0.01,
    decay: 0.2,
    sustain: 0.5,
    release: 0.3,
    amount: 2000,
  },
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.8,
    release: 0.3,
  },
  portamento: 0,
  vibrato: {
    frequency: 5,
    depth: 0,
  },
  distortion: 0,
  delay: {
    time: 0.25,
    feedback: 0.3,
    wet: 0.2,
  },
};

export const LEAD_PRESETS: Record<string, Partial<LeadSynthPreset>> = {
  'Classic Lead': DEFAULT_PRESET,
  'Fat Lead': {
    oscillatorType: 'sawtooth',
    filterFrequency: 4000,
    filterResonance: 3,
    filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.5, amount: 3000 },
    envelope: { attack: 0.02, decay: 0.15, sustain: 0.7, release: 0.4 },
    distortion: 0.2,
  },
  'Square Lead': {
    oscillatorType: 'square',
    filterFrequency: 5000,
    filterResonance: 1,
    filterEnvelope: { attack: 0.005, decay: 0.1, sustain: 0.6, release: 0.2, amount: 1500 },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 0.2 },
    delay: { time: 0.375, feedback: 0.4, wet: 0.3 },
  },
  'Smooth Lead': {
    oscillatorType: 'sine',
    filterFrequency: 2000,
    filterResonance: 0.5,
    filterEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.8, release: 0.5, amount: 500 },
    envelope: { attack: 0.1, decay: 0.2, sustain: 0.9, release: 0.5 },
    vibrato: { frequency: 5, depth: 0.05 },
    portamento: 0.05,
  },
  'Screaming Lead': {
    oscillatorType: 'sawtooth',
    filterFrequency: 6000,
    filterResonance: 5,
    filterEnvelope: { attack: 0.001, decay: 0.1, sustain: 0.3, release: 0.2, amount: 4000 },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0.9, release: 0.15 },
    distortion: 0.5,
    vibrato: { frequency: 6, depth: 0.1 },
  },
  'PWM Lead': {
    oscillatorType: 'pwm',
    pulseWidth: 0.3,
    filterFrequency: 4000,
    filterResonance: 2,
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3, amount: 2500 },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.3 },
  },
};

export class LeadSynth extends InstrumentBase {
  type: 'synth' = 'synth';

  private synth: Tone.MonoSynth;
  private vibrato: Tone.Vibrato;
  private distortion: Tone.Distortion;
  private delay: Tone.FeedbackDelay;
  private preset: LeadSynthPreset;

  constructor(name = 'Lead Synth') {
    super(name);
    this.preset = { ...DEFAULT_PRESET };

    // MonoSynth for monophonic lead with portamento
    this.synth = new Tone.MonoSynth({
      oscillator: {
        type: this.preset.oscillatorType === 'pwm' ? 'pulse' : this.preset.oscillatorType,
      },
      filter: {
        type: 'lowpass',
        frequency: this.preset.filterFrequency,
        Q: this.preset.filterResonance,
      },
      filterEnvelope: {
        attack: this.preset.filterEnvelope.attack,
        decay: this.preset.filterEnvelope.decay,
        sustain: this.preset.filterEnvelope.sustain,
        release: this.preset.filterEnvelope.release,
        baseFrequency: 200,
        octaves: Math.log2(this.preset.filterEnvelope.amount / 200),
      },
      envelope: this.preset.envelope,
      portamento: this.preset.portamento,
    });

    // Vibrato
    this.vibrato = new Tone.Vibrato({
      frequency: this.preset.vibrato.frequency,
      depth: this.preset.vibrato.depth,
    });

    // Distortion
    this.distortion = new Tone.Distortion({
      distortion: this.preset.distortion,
      wet: this.preset.distortion > 0 ? 1 : 0,
    });

    // Delay
    this.delay = new Tone.FeedbackDelay({
      delayTime: this.preset.delay.time,
      feedback: this.preset.delay.feedback,
      wet: this.preset.delay.wet,
    });

    // Connect chain
    this.synth.connect(this.vibrato);
    this.vibrato.connect(this.distortion);
    this.distortion.connect(this.delay);
    this.delay.connect(this.output);
  }

  triggerAttack(note: string | number, time?: number, velocity = 100): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = normalizeVelocity(velocity);
    this.synth.triggerAttack(noteStr, time, vel);
  }

  triggerRelease(_note: string | number, time?: number): void {
    this.synth.triggerRelease(time);
  }

  triggerAttackRelease(
    note: string | number,
    duration: number | string,
    time?: number,
    velocity = 100
  ): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = normalizeVelocity(velocity);
    this.synth.triggerAttackRelease(noteStr, duration, time, vel);
  }

  releaseAll(time?: number): void {
    this.synth.triggerRelease(time);
  }

  setPortamento(time: number): void {
    this.synth.portamento = time;
  }

  loadPreset(params: Record<string, unknown>): void {
    this.preset = { ...DEFAULT_PRESET, ...params as Partial<LeadSynthPreset> };

    this.synth.set({
      oscillator: {
        type: this.preset.oscillatorType === 'pwm' ? 'pulse' : this.preset.oscillatorType,
      },
      filter: {
        frequency: this.preset.filterFrequency,
        Q: this.preset.filterResonance,
      },
      filterEnvelope: {
        attack: this.preset.filterEnvelope.attack,
        decay: this.preset.filterEnvelope.decay,
        sustain: this.preset.filterEnvelope.sustain,
        release: this.preset.filterEnvelope.release,
        baseFrequency: 200,
        octaves: Math.log2(this.preset.filterEnvelope.amount / 200),
      },
      envelope: this.preset.envelope,
      portamento: this.preset.portamento,
    });

    this.vibrato.set({
      frequency: this.preset.vibrato.frequency,
      depth: this.preset.vibrato.depth,
    });

    this.distortion.set({
      distortion: this.preset.distortion,
      wet: this.preset.distortion > 0 ? 1 : 0,
    });

    this.delay.set({
      delayTime: this.preset.delay.time,
      feedback: this.preset.delay.feedback,
      wet: this.preset.delay.wet,
    });
  }

  getPreset(): Record<string, unknown> {
    return { ...this.preset };
  }

  dispose(): void {
    this.synth.dispose();
    this.vibrato.dispose();
    this.distortion.dispose();
    this.delay.dispose();
    super.dispose();
  }
}
