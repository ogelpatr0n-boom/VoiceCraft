import * as Tone from 'tone';
import { InstrumentBase, midiToToneNote, normalizeVelocity } from './instrument-base';

export interface ElectricPianoPreset {
  // Tone
  tine: number;        // Brightness of the tine/tonewheel
  bark: number;        // Attack "bark" characteristic
  decay: number;       // Note decay time
  release: number;     // Release time

  // Velocity response
  velocityCurve: 'soft' | 'medium' | 'hard';

  // Effects
  tremolo: {
    rate: number;
    depth: number;
  };
  chorus: {
    rate: number;
    depth: number;
    wet: number;
  };
  drive: number;       // Amp overdrive
  eq: {
    low: number;
    mid: number;
    high: number;
  };
}

const DEFAULT_PRESET: ElectricPianoPreset = {
  tine: 0.7,
  bark: 0.4,
  decay: 2,
  release: 0.8,
  velocityCurve: 'medium',
  tremolo: {
    rate: 5,
    depth: 0,
  },
  chorus: {
    rate: 0.5,
    depth: 0.3,
    wet: 0.3,
  },
  drive: 0,
  eq: {
    low: 0,
    mid: 0,
    high: 0,
  },
};

export const ELECTRIC_PIANO_PRESETS: Record<string, Partial<ElectricPianoPreset>> = {
  'Classic Rhodes': DEFAULT_PRESET,
  'Bright Rhodes': {
    tine: 0.9,
    bark: 0.5,
    decay: 1.5,
    chorus: { rate: 0.6, depth: 0.4, wet: 0.35 },
    eq: { low: -2, mid: 2, high: 4 },
  },
  'Dark Rhodes': {
    tine: 0.4,
    bark: 0.2,
    decay: 2.5,
    chorus: { rate: 0.4, depth: 0.2, wet: 0.25 },
    eq: { low: 3, mid: -1, high: -3 },
  },
  'Wurlitzer': {
    tine: 0.8,
    bark: 0.6,
    decay: 1.2,
    tremolo: { rate: 6, depth: 0.4 },
    chorus: { rate: 0, depth: 0, wet: 0 },
    drive: 0.3,
    eq: { low: -2, mid: 3, high: 2 },
  },
  'DX7 EP': {
    tine: 1.0,
    bark: 0.3,
    decay: 1.8,
    chorus: { rate: 0.8, depth: 0.5, wet: 0.4 },
    eq: { low: 0, mid: 0, high: 2 },
  },
  'Lo-Fi Keys': {
    tine: 0.5,
    bark: 0.2,
    decay: 1.0,
    release: 0.5,
    chorus: { rate: 0.3, depth: 0.6, wet: 0.5 },
    drive: 0.2,
    eq: { low: 2, mid: -3, high: -2 },
  },
  'Suitcase': {
    tine: 0.6,
    bark: 0.35,
    decay: 2.2,
    tremolo: { rate: 4.5, depth: 0.25 },
    chorus: { rate: 0.5, depth: 0.35, wet: 0.4 },
    eq: { low: 1, mid: 0, high: 1 },
  },
  'Funky Clav': {
    tine: 0.95,
    bark: 0.8,
    decay: 0.6,
    release: 0.3,
    velocityCurve: 'hard',
    chorus: { rate: 1, depth: 0.2, wet: 0.2 },
    drive: 0.4,
    eq: { low: -4, mid: 4, high: 3 },
  },
};

export class ElectricPiano extends InstrumentBase {
  type: 'keys' = 'keys';

  private synth: Tone.PolySynth<Tone.FMSynth>;
  private tremolo: Tone.Tremolo;
  private chorus: Tone.Chorus;
  private distortion: Tone.Distortion;
  private eq: Tone.EQ3;
  private preset: ElectricPianoPreset;

  constructor(name = 'Electric Piano') {
    super(name);
    this.preset = { ...DEFAULT_PRESET };

    // FM synth for electric piano tones
    this.synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.5,
      modulationIndex: this.preset.tine * 15,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: this.preset.decay,
        sustain: 0.1,
        release: this.preset.release,
      },
      modulation: { type: 'sine' },
      modulationEnvelope: {
        attack: 0.001,
        decay: this.preset.bark * 0.3,
        sustain: 0.2,
        release: this.preset.release * 0.5,
      },
    });

    // Tremolo
    this.tremolo = new Tone.Tremolo({
      frequency: this.preset.tremolo.rate,
      depth: this.preset.tremolo.depth,
    }).start();

    // Chorus
    this.chorus = new Tone.Chorus({
      frequency: this.preset.chorus.rate,
      depth: this.preset.chorus.depth,
      wet: this.preset.chorus.wet,
    }).start();

    // Distortion/Drive
    this.distortion = new Tone.Distortion({
      distortion: this.preset.drive,
      wet: this.preset.drive > 0 ? 1 : 0,
    });

    // EQ
    this.eq = new Tone.EQ3({
      low: this.preset.eq.low,
      mid: this.preset.eq.mid,
      high: this.preset.eq.high,
    });

    // Connect chain
    this.synth.connect(this.tremolo);
    this.tremolo.connect(this.chorus);
    this.chorus.connect(this.distortion);
    this.distortion.connect(this.eq);
    this.eq.connect(this.output);
  }

  private getVelocityMultiplier(velocity: number): number {
    const v = velocity / 127;
    switch (this.preset.velocityCurve) {
      case 'soft':
        return 0.5 + v * 0.5; // 0.5-1.0 range
      case 'hard':
        return v * v; // Exponential curve
      case 'medium':
      default:
        return v; // Linear
    }
  }

  triggerAttack(note: string | number, time?: number, velocity = 100): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = normalizeVelocity(velocity) * this.getVelocityMultiplier(velocity);
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
    velocity = 100
  ): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = normalizeVelocity(velocity) * this.getVelocityMultiplier(velocity);
    this.synth.triggerAttackRelease(noteStr, duration, time, vel);
  }

  releaseAll(time?: number): void {
    this.synth.releaseAll(time);
  }

  loadPreset(params: Record<string, unknown>): void {
    this.preset = { ...DEFAULT_PRESET, ...params as Partial<ElectricPianoPreset> };

    this.synth.set({
      modulationIndex: this.preset.tine * 15,
      envelope: {
        decay: this.preset.decay,
        release: this.preset.release,
      },
      modulationEnvelope: {
        decay: this.preset.bark * 0.3,
        release: this.preset.release * 0.5,
      },
    });

    this.tremolo.set({
      frequency: this.preset.tremolo.rate,
      depth: this.preset.tremolo.depth,
    });

    this.chorus.set({
      frequency: this.preset.chorus.rate,
      depth: this.preset.chorus.depth,
      wet: this.preset.chorus.wet,
    });

    this.distortion.set({
      distortion: this.preset.drive,
      wet: this.preset.drive > 0 ? 1 : 0,
    });

    this.eq.set({
      low: this.preset.eq.low,
      mid: this.preset.eq.mid,
      high: this.preset.eq.high,
    });
  }

  getPreset(): Record<string, unknown> {
    return { ...this.preset };
  }

  dispose(): void {
    this.synth.dispose();
    this.tremolo.dispose();
    this.chorus.dispose();
    this.distortion.dispose();
    this.eq.dispose();
    super.dispose();
  }
}
