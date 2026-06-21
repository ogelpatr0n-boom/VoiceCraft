import * as Tone from 'tone';
import { InstrumentBase, midiToToneNote, normalizeVelocity } from './instrument-base';

// FM Synthesis for classic electronic sounds (DX7-style)
export interface FMSynthParams {
  harmonicity: number;
  modulationIndex: number;
  oscillator: {
    type: 'sine' | 'square' | 'triangle' | 'sawtooth';
  };
  modulation: {
    type: 'sine' | 'square' | 'triangle' | 'sawtooth';
  };
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  modulationEnvelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

const DEFAULT_PARAMS: FMSynthParams = {
  harmonicity: 3,
  modulationIndex: 10,
  oscillator: { type: 'sine' },
  modulation: { type: 'sine' },
  envelope: {
    attack: 0.01,
    decay: 0.3,
    sustain: 0.3,
    release: 0.5,
  },
  modulationEnvelope: {
    attack: 0.01,
    decay: 0.5,
    sustain: 0.2,
    release: 0.5,
  },
};

export class FMSynth extends InstrumentBase {
  type: 'synth' = 'synth';
  private synth: Tone.PolySynth<Tone.FMSynth>;
  private params: FMSynthParams;

  constructor(name = 'FM Synth') {
    super(name);
    this.params = { ...DEFAULT_PARAMS };

    this.synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: this.params.harmonicity,
      modulationIndex: this.params.modulationIndex,
      oscillator: this.params.oscillator,
      modulation: this.params.modulation,
      envelope: this.params.envelope,
      modulationEnvelope: this.params.modulationEnvelope,
    });

    this.synth.connect(this.output);
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

  setHarmonicity(value: number): void {
    this.params.harmonicity = value;
    this.synth.set({ harmonicity: value });
  }

  setModulationIndex(value: number): void {
    this.params.modulationIndex = value;
    this.synth.set({ modulationIndex: value });
  }

  loadPreset(params: Record<string, unknown>): void {
    const p = params as Partial<FMSynthParams>;
    if (p.harmonicity !== undefined) this.setHarmonicity(p.harmonicity);
    if (p.modulationIndex !== undefined) this.setModulationIndex(p.modulationIndex);
    if (p.envelope) {
      this.params.envelope = { ...this.params.envelope, ...p.envelope };
      this.synth.set({ envelope: this.params.envelope });
    }
  }

  getPreset(): Record<string, unknown> {
    return { ...this.params };
  }

  getParams(): FMSynthParams {
    return { ...this.params };
  }

  dispose(): void {
    this.synth.dispose();
    super.dispose();
  }
}

export function createFMSynth(name?: string): FMSynth {
  return new FMSynth(name);
}
