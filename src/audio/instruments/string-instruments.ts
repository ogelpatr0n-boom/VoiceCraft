import * as Tone from 'tone';
import { InstrumentBase, midiToToneNote, normalizeVelocity } from './instrument-base';

// Plucked string synthesis for acoustic instruments
export type StringInstrumentType =
  | 'acoustic-guitar'
  | 'electric-guitar'
  | 'banjo'
  | 'mandolin'
  | 'ukulele'
  | 'harp';

export interface PluckedStringParams {
  instrument: StringInstrumentType;
  resonance: number;
  dampening: number;
  attack: number;
  release: number;
}

const INSTRUMENT_SETTINGS: Record<StringInstrumentType, {
  attackNoise: number;
  resonance: number;
  dampening: number;
  harmonics: number;
}> = {
  'acoustic-guitar': { attackNoise: 0.3, resonance: 0.98, dampening: 3500, harmonics: 1 },
  'electric-guitar': { attackNoise: 0.2, resonance: 0.95, dampening: 5000, harmonics: 0.8 },
  'banjo': { attackNoise: 0.5, resonance: 0.9, dampening: 2000, harmonics: 1.5 },
  'mandolin': { attackNoise: 0.4, resonance: 0.92, dampening: 3000, harmonics: 2 },
  'ukulele': { attackNoise: 0.35, resonance: 0.94, dampening: 4000, harmonics: 1 },
  'harp': { attackNoise: 0.1, resonance: 0.99, dampening: 6000, harmonics: 0.5 },
};

export class PluckedStringSynth extends InstrumentBase {
  type: 'sampler' = 'sampler';
  private synth: Tone.PluckSynth;
  private filter: Tone.Filter;
  private params: PluckedStringParams;

  constructor(name = 'Acoustic Guitar') {
    super(name);

    this.params = {
      instrument: 'acoustic-guitar',
      resonance: 0.98,
      dampening: 3500,
      attack: 0.01,
      release: 1,
    };

    const settings = INSTRUMENT_SETTINGS['acoustic-guitar'];

    this.synth = new Tone.PluckSynth({
      attackNoise: settings.attackNoise,
      resonance: settings.resonance,
      dampening: settings.dampening,
    });

    this.filter = new Tone.Filter({
      frequency: 5000,
      type: 'lowpass',
    });

    this.synth.connect(this.filter);
    this.filter.connect(this.output);
  }

  triggerAttack(note: string | number, time?: number, velocity = 1): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = velocity > 1 ? normalizeVelocity(velocity) : velocity;
    // PluckSynth is designed for attack-release, but we can trigger just attack
    this.synth.triggerAttack(noteStr, time);
  }

  triggerRelease(_note: string | number, _time?: number): void {
    // PluckSynth naturally decays, no explicit release needed
  }

  triggerAttackRelease(
    note: string | number,
    duration: number | string,
    time?: number,
    velocity = 1
  ): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    this.synth.triggerAttack(noteStr, time);
  }

  releaseAll(_time?: number): void {
    // PluckSynth naturally decays
  }

  setInstrumentType(type: StringInstrumentType): void {
    this.params.instrument = type;
    const settings = INSTRUMENT_SETTINGS[type];
    this.synth.attackNoise = settings.attackNoise;
    this.synth.resonance = settings.resonance;
    this.synth.dampening = settings.dampening;
  }

  setResonance(value: number): void {
    this.params.resonance = value;
    this.synth.resonance = value;
  }

  setDampening(value: number): void {
    this.params.dampening = value;
    this.synth.dampening = value;
  }

  loadPreset(params: Record<string, unknown>): void {
    const p = params as Partial<PluckedStringParams>;
    if (p.instrument) this.setInstrumentType(p.instrument);
    if (p.resonance !== undefined) this.setResonance(p.resonance);
    if (p.dampening !== undefined) this.setDampening(p.dampening);
  }

  getPreset(): Record<string, unknown> {
    return { ...this.params };
  }

  getParams(): PluckedStringParams {
    return { ...this.params };
  }

  dispose(): void {
    this.synth.dispose();
    this.filter.dispose();
    super.dispose();
  }
}

// Bowed string synthesis (violin, fiddle, cello)
export type BowedStringType = 'violin' | 'fiddle' | 'viola' | 'cello' | 'double-bass';

export interface BowedStringParams {
  instrument: BowedStringType;
  vibrato: {
    frequency: number;
    depth: number;
  };
  bow: {
    pressure: number;
    position: number;
  };
}

export class BowedStringSynth extends InstrumentBase {
  type: 'sampler' = 'sampler';
  private synth: Tone.PolySynth;
  private vibrato: Tone.Vibrato;
  private params: BowedStringParams;

  constructor(name = 'Fiddle') {
    super(name);

    this.params = {
      instrument: 'fiddle',
      vibrato: { frequency: 5, depth: 0.1 },
      bow: { pressure: 0.5, position: 0.5 },
    };

    // Bowed strings use sustained tones with vibrato
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth8' },
      envelope: {
        attack: 0.1,
        decay: 0.1,
        sustain: 0.9,
        release: 0.3,
      },
    });

    this.vibrato = new Tone.Vibrato({
      frequency: this.params.vibrato.frequency,
      depth: this.params.vibrato.depth,
    });

    this.synth.connect(this.vibrato);
    this.vibrato.connect(this.output);
  }

  triggerAttack(note: string | number, time?: number, velocity = 1): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = velocity > 1 ? normalizeVelocity(velocity) : velocity;
    this.synth.triggerAttack(noteStr, time, vel);
  }

  triggerRelease(note: string | number, time?: number): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    this.synth.triggerRelease(noteStr, time);
  }

  triggerAttackRelease(
    note: string | number,
    duration: number | string,
    time?: number,
    velocity = 1
  ): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = velocity > 1 ? normalizeVelocity(velocity) : velocity;
    this.synth.triggerAttackRelease(noteStr, duration, time, vel);
  }

  releaseAll(time?: number): void {
    this.synth.releaseAll(time);
  }

  setVibratoFrequency(value: number): void {
    this.params.vibrato.frequency = value;
    this.vibrato.frequency.value = value;
  }

  setVibratoDepth(value: number): void {
    this.params.vibrato.depth = value;
    this.vibrato.depth.value = value;
  }

  loadPreset(params: Record<string, unknown>): void {
    const p = params as Partial<BowedStringParams>;
    if (p.vibrato?.frequency !== undefined) this.setVibratoFrequency(p.vibrato.frequency);
    if (p.vibrato?.depth !== undefined) this.setVibratoDepth(p.vibrato.depth);
  }

  getPreset(): Record<string, unknown> {
    return { ...this.params };
  }

  getParams(): BowedStringParams {
    return { ...this.params };
  }

  dispose(): void {
    this.synth.dispose();
    this.vibrato.dispose();
    super.dispose();
  }
}

// Pedal Steel Guitar for country music
export class PedalSteelSynth extends InstrumentBase {
  type: 'sampler' = 'sampler';
  private synth: Tone.PolySynth;
  private vibrato: Tone.Vibrato;
  private delay: Tone.FeedbackDelay;

  constructor(name = 'Pedal Steel') {
    super(name);

    // Pedal steel has a distinctive sliding, sustained tone
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine4' },
      envelope: {
        attack: 0.3,
        decay: 0.2,
        sustain: 0.8,
        release: 1.5,
      },
    });

    this.vibrato = new Tone.Vibrato({
      frequency: 4,
      depth: 0.15,
    });

    // Slight delay for that classic pedal steel sound
    this.delay = new Tone.FeedbackDelay({
      delayTime: 0.15,
      feedback: 0.2,
      wet: 0.3,
    });

    this.synth.connect(this.vibrato);
    this.vibrato.connect(this.delay);
    this.delay.connect(this.output);
  }

  triggerAttack(note: string | number, time?: number, velocity = 1): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = velocity > 1 ? normalizeVelocity(velocity) : velocity;
    this.synth.triggerAttack(noteStr, time, vel);
  }

  triggerRelease(note: string | number, time?: number): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    this.synth.triggerRelease(noteStr, time);
  }

  triggerAttackRelease(
    note: string | number,
    duration: number | string,
    time?: number,
    velocity = 1
  ): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = velocity > 1 ? normalizeVelocity(velocity) : velocity;
    this.synth.triggerAttackRelease(noteStr, duration, time, vel);
  }

  releaseAll(time?: number): void {
    this.synth.releaseAll(time);
  }

  loadPreset(_params: Record<string, unknown>): void {
    // No presets for now
  }

  getPreset(): Record<string, unknown> {
    return {};
  }

  dispose(): void {
    this.synth.dispose();
    this.vibrato.dispose();
    this.delay.dispose();
    super.dispose();
  }
}

// Factory functions
export function createPluckedString(name?: string): PluckedStringSynth {
  return new PluckedStringSynth(name);
}

export function createBowedString(name?: string): BowedStringSynth {
  return new BowedStringSynth(name);
}

export function createPedalSteel(name?: string): PedalSteelSynth {
  return new PedalSteelSynth(name);
}
