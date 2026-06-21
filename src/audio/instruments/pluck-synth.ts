import * as Tone from 'tone';
import { InstrumentBase, midiToToneNote, normalizeVelocity } from './instrument-base';

export interface PluckSynthPreset {
  attackNoise: number;
  dampening: number;
  resonance: number;
  release: number;
  delay: {
    time: number;
    feedback: number;
    wet: number;
  };
  reverb: {
    decay: number;
    wet: number;
  };
}

const DEFAULT_PRESET: PluckSynthPreset = {
  attackNoise: 1,
  dampening: 4000,
  resonance: 0.7,
  release: 1,
  delay: {
    time: 0.25,
    feedback: 0.2,
    wet: 0.15,
  },
  reverb: {
    decay: 2,
    wet: 0.2,
  },
};

export const PLUCK_PRESETS: Record<string, Partial<PluckSynthPreset>> = {
  'Acoustic': DEFAULT_PRESET,
  'Bright': {
    attackNoise: 1.5,
    dampening: 8000,
    resonance: 0.8,
    release: 0.8,
    reverb: { decay: 1.5, wet: 0.15 },
  },
  'Muted': {
    attackNoise: 0.5,
    dampening: 2000,
    resonance: 0.5,
    release: 0.5,
    delay: { time: 0, feedback: 0, wet: 0 },
    reverb: { decay: 1, wet: 0.1 },
  },
  'Harp': {
    attackNoise: 0.3,
    dampening: 6000,
    resonance: 0.9,
    release: 2,
    delay: { time: 0.375, feedback: 0.3, wet: 0.25 },
    reverb: { decay: 3, wet: 0.35 },
  },
  'Kalimba': {
    attackNoise: 2,
    dampening: 5000,
    resonance: 0.85,
    release: 1.5,
    delay: { time: 0.2, feedback: 0.25, wet: 0.2 },
    reverb: { decay: 2.5, wet: 0.3 },
  },
  'Steel String': {
    attackNoise: 1.2,
    dampening: 7000,
    resonance: 0.75,
    release: 1.2,
    reverb: { decay: 2, wet: 0.25 },
  },
};

export class PluckSynth extends InstrumentBase {
  type: 'synth' = 'synth';

  private synth: Tone.PluckSynth;
  private delay: Tone.FeedbackDelay;
  private reverb: Tone.Reverb;
  private preset: PluckSynthPreset;

  constructor(name = 'Pluck Synth') {
    super(name);
    this.preset = { ...DEFAULT_PRESET };

    // Karplus-Strong style plucked string synthesis
    this.synth = new Tone.PluckSynth({
      attackNoise: this.preset.attackNoise,
      dampening: this.preset.dampening,
      resonance: this.preset.resonance,
      release: this.preset.release,
    });

    // Effects
    this.delay = new Tone.FeedbackDelay({
      delayTime: this.preset.delay.time,
      feedback: this.preset.delay.feedback,
      wet: this.preset.delay.wet,
    });

    this.reverb = new Tone.Reverb({
      decay: this.preset.reverb.decay,
      wet: this.preset.reverb.wet,
    });

    // Connect chain
    this.synth.connect(this.delay);
    this.delay.connect(this.reverb);
    this.reverb.connect(this.output);
  }

  triggerAttack(note: string | number, time?: number, velocity = 100): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    // PluckSynth doesn't support velocity in attack, only in triggerAttackRelease
    this.synth.triggerAttack(noteStr, time);
  }

  triggerRelease(_note: string | number, _time?: number): void {
    // PluckSynth auto-decays, no explicit release needed
  }

  triggerAttackRelease(
    note: string | number,
    duration: number | string,
    time?: number,
    velocity = 100
  ): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = normalizeVelocity(velocity);
    // PluckSynth doesn't use duration in the traditional sense
    this.synth.triggerAttack(noteStr, time);
  }

  releaseAll(_time?: number): void {
    // PluckSynth auto-decays
  }

  loadPreset(params: Record<string, unknown>): void {
    this.preset = { ...DEFAULT_PRESET, ...params as Partial<PluckSynthPreset> };

    this.synth.set({
      attackNoise: this.preset.attackNoise,
      dampening: this.preset.dampening,
      resonance: this.preset.resonance,
      release: this.preset.release,
    });

    this.delay.set({
      delayTime: this.preset.delay.time,
      feedback: this.preset.delay.feedback,
      wet: this.preset.delay.wet,
    });

    this.reverb.set({
      decay: this.preset.reverb.decay,
      wet: this.preset.reverb.wet,
    });
  }

  getPreset(): Record<string, unknown> {
    return { ...this.preset };
  }

  dispose(): void {
    this.synth.dispose();
    this.delay.dispose();
    this.reverb.dispose();
    super.dispose();
  }
}
