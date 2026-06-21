import * as Tone from 'tone';
import { InstrumentBase, midiToToneNote, normalizeVelocity } from './instrument-base';

// Simple synthesized piano-like sounds for demo
// In a real app, these would be loaded from audio samples

export interface SamplerParams {
  instrument: string;
  attack: number;
  release: number;
}

const DEFAULT_PARAMS: SamplerParams = {
  instrument: 'piano',
  attack: 0.01,
  release: 0.5,
};

export class SamplerInstrument extends InstrumentBase {
  type: 'sampler' = 'sampler';
  private synth: Tone.PolySynth;
  private params: SamplerParams;

  constructor(name = 'Sampler') {
    super(name);

    this.params = { ...DEFAULT_PARAMS };

    // Use a synthesized approximation
    // In a real app, this would use Tone.Sampler with actual samples
    this.synth = this.createInstrumentSynth('piano');
    this.synth.connect(this.output);
  }

  private createInstrumentSynth(instrument: string): Tone.PolySynth {
    switch (instrument) {
      case 'piano':
        return new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle8' },
          envelope: {
            attack: 0.01,
            decay: 0.3,
            sustain: 0.3,
            release: 1.2,
          },
        });

      case 'strings':
        return new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth8' },
          envelope: {
            attack: 0.3,
            decay: 0.3,
            sustain: 0.8,
            release: 1.5,
          },
        });

      case 'organ':
        return new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine4' },
          envelope: {
            attack: 0.01,
            decay: 0.1,
            sustain: 0.9,
            release: 0.1,
          },
        });

      case 'brass':
        return new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: {
            attack: 0.05,
            decay: 0.2,
            sustain: 0.7,
            release: 0.3,
          },
        });

      case 'bells':
        return new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: {
            attack: 0.001,
            decay: 1.5,
            sustain: 0,
            release: 1,
          },
        });

      default:
        return new Tone.PolySynth(Tone.Synth);
    }
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

  setAttack(attack: number): void {
    this.params.attack = attack;
    this.synth.set({ envelope: { attack } });
  }

  setRelease(release: number): void {
    this.params.release = release;
    this.synth.set({ envelope: { release } });
  }

  loadPreset(params: Record<string, unknown>): void {
    const p = params as Partial<SamplerParams>;

    if (p.instrument && p.instrument !== this.params.instrument) {
      this.params.instrument = p.instrument;
      // Recreate synth with new instrument type
      this.synth.disconnect();
      this.synth.dispose();
      this.synth = this.createInstrumentSynth(p.instrument);
      this.synth.connect(this.output);
    }

    if (p.attack !== undefined) this.setAttack(p.attack);
    if (p.release !== undefined) this.setRelease(p.release);
  }

  getPreset(): Record<string, unknown> {
    return { ...this.params };
  }

  getParams(): SamplerParams {
    return { ...this.params };
  }

  getInstrumentType(): string {
    return this.params.instrument;
  }

  dispose(): void {
    this.synth.dispose();
    super.dispose();
  }
}

// Factory function
export function createSampler(name?: string): SamplerInstrument {
  return new SamplerInstrument(name);
}

// Available instrument sounds
export const SAMPLER_INSTRUMENTS = [
  'piano',
  'strings',
  'organ',
  'brass',
  'bells',
] as const;

export type SamplerInstrumentType = typeof SAMPLER_INSTRUMENTS[number];
