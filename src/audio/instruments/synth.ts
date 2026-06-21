import * as Tone from 'tone';
import { InstrumentBase, midiToToneNote, normalizeVelocity } from './instrument-base';

export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type FilterType = 'lowpass' | 'highpass' | 'bandpass';

export interface SynthParams {
  oscillator: {
    type: OscillatorType;
  };
  filter: {
    frequency: number;
    type: FilterType;
    rolloff: -12 | -24 | -48;
  };
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  filterEnvelope?: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    baseFrequency: number;
    octaves: number;
  };
}

const DEFAULT_PARAMS: SynthParams = {
  oscillator: { type: 'sawtooth' },
  filter: { frequency: 2000, type: 'lowpass', rolloff: -12 },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
};

export class SynthInstrument extends InstrumentBase {
  type: 'synth' = 'synth';
  private synth: Tone.PolySynth;
  private filter: Tone.Filter;
  private params: SynthParams;

  constructor(name = 'Synth') {
    super(name);

    this.params = { ...DEFAULT_PARAMS };

    // Create polyphonic synth with 8 voices
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: this.params.oscillator,
      envelope: this.params.envelope,
    });

    // Create filter
    this.filter = new Tone.Filter({
      frequency: this.params.filter.frequency,
      type: this.params.filter.type,
      rolloff: this.params.filter.rolloff,
    });

    // Connect: synth -> filter -> output
    this.synth.connect(this.filter);
    this.filter.connect(this.output);
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

  // Parameter setters
  setOscillatorType(type: OscillatorType): void {
    this.params.oscillator.type = type;
    this.synth.set({ oscillator: { type } });
  }

  setFilterFrequency(frequency: number): void {
    this.params.filter.frequency = frequency;
    this.filter.frequency.value = frequency;
  }

  setFilterType(type: FilterType): void {
    this.params.filter.type = type;
    this.filter.type = type;
  }

  setAttack(attack: number): void {
    this.params.envelope.attack = attack;
    this.synth.set({ envelope: { attack } });
  }

  setDecay(decay: number): void {
    this.params.envelope.decay = decay;
    this.synth.set({ envelope: { decay } });
  }

  setSustain(sustain: number): void {
    this.params.envelope.sustain = sustain;
    this.synth.set({ envelope: { sustain } });
  }

  setRelease(release: number): void {
    this.params.envelope.release = release;
    this.synth.set({ envelope: { release } });
  }

  loadPreset(params: Record<string, unknown>): void {
    const p = params as Partial<SynthParams>;

    if (p.oscillator?.type) {
      this.setOscillatorType(p.oscillator.type);
    }
    if (p.filter) {
      if (p.filter.frequency !== undefined) this.setFilterFrequency(p.filter.frequency);
      if (p.filter.type) this.setFilterType(p.filter.type);
      if (p.filter.rolloff) {
        this.params.filter.rolloff = p.filter.rolloff;
        this.filter.rolloff = p.filter.rolloff;
      }
    }
    if (p.envelope) {
      if (p.envelope.attack !== undefined) this.setAttack(p.envelope.attack);
      if (p.envelope.decay !== undefined) this.setDecay(p.envelope.decay);
      if (p.envelope.sustain !== undefined) this.setSustain(p.envelope.sustain);
      if (p.envelope.release !== undefined) this.setRelease(p.envelope.release);
    }
  }

  getPreset(): Record<string, unknown> {
    return { ...this.params };
  }

  getParams(): SynthParams {
    return { ...this.params };
  }

  dispose(): void {
    this.synth.dispose();
    this.filter.dispose();
    super.dispose();
  }
}

// Factory function
export function createSynth(name?: string): SynthInstrument {
  return new SynthInstrument(name);
}
