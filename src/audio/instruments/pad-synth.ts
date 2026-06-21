import * as Tone from 'tone';
import { InstrumentBase, midiToToneNote, normalizeVelocity } from './instrument-base';

export interface PadSynthPreset {
  oscillator1Type: 'sine' | 'sawtooth' | 'square' | 'triangle';
  oscillator2Type: 'sine' | 'sawtooth' | 'square' | 'triangle';
  oscillator2Detune: number;
  filterFrequency: number;
  filterResonance: number;
  filterEnvelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  chorus: {
    frequency: number;
    depth: number;
    wet: number;
  };
  reverb: {
    decay: number;
    wet: number;
  };
}

const DEFAULT_PRESET: PadSynthPreset = {
  oscillator1Type: 'sawtooth',
  oscillator2Type: 'sawtooth',
  oscillator2Detune: 7,
  filterFrequency: 2000,
  filterResonance: 1,
  filterEnvelope: {
    attack: 0.5,
    decay: 1,
    sustain: 0.8,
    release: 2,
  },
  envelope: {
    attack: 0.8,
    decay: 0.5,
    sustain: 0.9,
    release: 3,
  },
  chorus: {
    frequency: 0.5,
    depth: 0.3,
    wet: 0.5,
  },
  reverb: {
    decay: 4,
    wet: 0.4,
  },
};

export const PAD_PRESETS: Record<string, Partial<PadSynthPreset>> = {
  'Warm Pad': DEFAULT_PRESET,
  'Strings': {
    oscillator1Type: 'sawtooth',
    oscillator2Type: 'sawtooth',
    oscillator2Detune: 12,
    filterFrequency: 3000,
    envelope: { attack: 1.2, decay: 0.3, sustain: 0.85, release: 2 },
    chorus: { frequency: 0.3, depth: 0.4, wet: 0.6 },
    reverb: { decay: 3, wet: 0.3 },
  },
  'Ambient': {
    oscillator1Type: 'sine',
    oscillator2Type: 'triangle',
    oscillator2Detune: 3,
    filterFrequency: 1500,
    envelope: { attack: 2, decay: 1, sustain: 0.7, release: 5 },
    chorus: { frequency: 0.2, depth: 0.5, wet: 0.7 },
    reverb: { decay: 6, wet: 0.6 },
  },
  'Digital': {
    oscillator1Type: 'square',
    oscillator2Type: 'sawtooth',
    oscillator2Detune: 5,
    filterFrequency: 4000,
    envelope: { attack: 0.3, decay: 0.5, sustain: 0.9, release: 2 },
    chorus: { frequency: 1, depth: 0.2, wet: 0.3 },
    reverb: { decay: 2, wet: 0.25 },
  },
  'Choir': {
    oscillator1Type: 'sine',
    oscillator2Type: 'sine',
    oscillator2Detune: 2,
    filterFrequency: 2500,
    filterResonance: 2,
    envelope: { attack: 1.5, decay: 0.5, sustain: 0.8, release: 3 },
    chorus: { frequency: 0.4, depth: 0.6, wet: 0.8 },
    reverb: { decay: 5, wet: 0.5 },
  },
};

export class PadSynth extends InstrumentBase {
  type: 'synth' = 'synth';

  private synth1: Tone.PolySynth;
  private synth2: Tone.PolySynth;
  private filter: Tone.Filter;
  private filterEnv: Tone.FrequencyEnvelope;
  private chorus: Tone.Chorus;
  private reverb: Tone.Reverb;
  private preset: PadSynthPreset;

  constructor(name = 'Pad Synth') {
    super(name);
    this.preset = { ...DEFAULT_PRESET };

    // Create two synths for layering
    this.synth1 = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: this.preset.oscillator1Type },
      envelope: this.preset.envelope,
    });

    this.synth2 = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: this.preset.oscillator2Type },
      envelope: this.preset.envelope,
      detune: this.preset.oscillator2Detune * 100,
    });

    // Filter
    this.filter = new Tone.Filter({
      frequency: this.preset.filterFrequency,
      type: 'lowpass',
      Q: this.preset.filterResonance,
    });

    // Filter envelope
    this.filterEnv = new Tone.FrequencyEnvelope({
      ...this.preset.filterEnvelope,
      baseFrequency: 200,
      octaves: 4,
    });
    this.filterEnv.connect(this.filter.frequency);

    // Effects
    this.chorus = new Tone.Chorus({
      frequency: this.preset.chorus.frequency,
      depth: this.preset.chorus.depth,
      wet: this.preset.chorus.wet,
    }).start();

    this.reverb = new Tone.Reverb({
      decay: this.preset.reverb.decay,
      wet: this.preset.reverb.wet,
    });

    // Connect: synths -> filter -> chorus -> reverb -> output
    const merge = new Tone.Gain(0.5);
    this.synth1.connect(merge);
    this.synth2.connect(merge);
    merge.connect(this.filter);
    this.filter.connect(this.chorus);
    this.chorus.connect(this.reverb);
    this.reverb.connect(this.output);
  }

  triggerAttack(note: string | number, time?: number, velocity = 100): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = normalizeVelocity(velocity);
    const t = time ?? Tone.now();

    this.synth1.triggerAttack(noteStr, t, vel);
    this.synth2.triggerAttack(noteStr, t, vel * 0.7);
    this.filterEnv.triggerAttack(t);
  }

  triggerRelease(note: string | number, time?: number): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const t = time ?? Tone.now();

    this.synth1.triggerRelease(noteStr, t);
    this.synth2.triggerRelease(noteStr, t);
    this.filterEnv.triggerRelease(t);
  }

  triggerAttackRelease(
    note: string | number,
    duration: number | string,
    time?: number,
    velocity = 100
  ): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = normalizeVelocity(velocity);
    const t = time ?? Tone.now();

    this.synth1.triggerAttackRelease(noteStr, duration, t, vel);
    this.synth2.triggerAttackRelease(noteStr, duration, t, vel * 0.7);
    this.filterEnv.triggerAttack(t);
    this.filterEnv.triggerRelease(Tone.Time(duration).toSeconds() + (t - Tone.now()));
  }

  releaseAll(time?: number): void {
    this.synth1.releaseAll(time);
    this.synth2.releaseAll(time);
    this.filterEnv.triggerRelease(time);
  }

  loadPreset(params: Record<string, unknown>): void {
    this.preset = { ...DEFAULT_PRESET, ...params as Partial<PadSynthPreset> };

    this.synth1.set({
      oscillator: { type: this.preset.oscillator1Type },
      envelope: this.preset.envelope,
    });

    this.synth2.set({
      oscillator: { type: this.preset.oscillator2Type },
      envelope: this.preset.envelope,
      detune: this.preset.oscillator2Detune * 100,
    });

    this.filter.frequency.value = this.preset.filterFrequency;
    this.filter.Q.value = this.preset.filterResonance;
    this.filterEnv.set(this.preset.filterEnvelope);

    this.chorus.set({
      frequency: this.preset.chorus.frequency,
      depth: this.preset.chorus.depth,
      wet: this.preset.chorus.wet,
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
    this.synth1.dispose();
    this.synth2.dispose();
    this.filter.dispose();
    this.filterEnv.dispose();
    this.chorus.dispose();
    this.reverb.dispose();
    super.dispose();
  }
}
