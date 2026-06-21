import * as Tone from 'tone';
import { InstrumentBase, midiToToneNote, normalizeVelocity } from './instrument-base';

// TB-303 style acid bass synth
export interface BassSynthParams {
  oscillator: {
    type: 'sawtooth' | 'square';
  };
  filter: {
    frequency: number;
    resonance: number;
    envelope: {
      attack: number;
      decay: number;
      sustain: number;
      release: number;
    };
  };
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  glide: number;
  accent: number;
}

const DEFAULT_PARAMS: BassSynthParams = {
  oscillator: { type: 'sawtooth' },
  filter: {
    frequency: 800,
    resonance: 15,
    envelope: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.2,
      release: 0.1,
    },
  },
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.6,
    release: 0.1,
  },
  glide: 0,
  accent: 0.5,
};

export class BassSynth extends InstrumentBase {
  type: 'synth' = 'synth';
  private synth: Tone.MonoSynth;
  private filter: Tone.Filter;
  private distortion: Tone.Distortion;
  private params: BassSynthParams;

  constructor(name = 'Bass Synth') {
    super(name);
    this.params = { ...DEFAULT_PARAMS };

    // Create mono synth for bass (TB-303 style is monophonic)
    this.synth = new Tone.MonoSynth({
      oscillator: { type: this.params.oscillator.type },
      envelope: this.params.envelope,
      filterEnvelope: {
        attack: this.params.filter.envelope.attack,
        decay: this.params.filter.envelope.decay,
        sustain: this.params.filter.envelope.sustain,
        release: this.params.filter.envelope.release,
        baseFrequency: 200,
        octaves: 4,
      },
    });

    // Add resonant filter for that acid sound
    this.filter = new Tone.Filter({
      frequency: this.params.filter.frequency,
      type: 'lowpass',
      rolloff: -24,
      Q: this.params.filter.resonance,
    });

    // Add subtle distortion for grit
    this.distortion = new Tone.Distortion(0.2);

    // Connect chain
    this.synth.connect(this.filter);
    this.filter.connect(this.distortion);
    this.distortion.connect(this.output);

    // Set glide/portamento
    this.synth.portamento = this.params.glide;
  }

  triggerAttack(note: string | number, time?: number, velocity = 1): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = velocity > 1 ? normalizeVelocity(velocity) : velocity;
    this.synth.triggerAttack(noteStr, time, vel);
  }

  triggerRelease(note: string | number, time?: number): void {
    this.synth.triggerRelease(time);
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
    this.synth.triggerRelease(time);
  }

  // Parameter setters
  setOscillatorType(type: 'sawtooth' | 'square'): void {
    this.params.oscillator.type = type;
    this.synth.oscillator.type = type;
  }

  setFilterFrequency(frequency: number): void {
    this.params.filter.frequency = frequency;
    this.filter.frequency.value = frequency;
  }

  setResonance(resonance: number): void {
    this.params.filter.resonance = resonance;
    this.filter.Q.value = resonance;
  }

  setGlide(glide: number): void {
    this.params.glide = glide;
    this.synth.portamento = glide;
  }

  setDistortion(amount: number): void {
    this.distortion.distortion = amount;
  }

  loadPreset(params: Record<string, unknown>): void {
    const p = params as Partial<BassSynthParams>;
    if (p.oscillator?.type) this.setOscillatorType(p.oscillator.type);
    if (p.filter?.frequency !== undefined) this.setFilterFrequency(p.filter.frequency);
    if (p.filter?.resonance !== undefined) this.setResonance(p.filter.resonance);
    if (p.glide !== undefined) this.setGlide(p.glide);
  }

  getPreset(): Record<string, unknown> {
    return { ...this.params };
  }

  getParams(): BassSynthParams {
    return { ...this.params };
  }

  dispose(): void {
    this.synth.dispose();
    this.filter.dispose();
    this.distortion.dispose();
    super.dispose();
  }
}

export function createBassSynth(name?: string): BassSynth {
  return new BassSynth(name);
}
