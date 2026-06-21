import * as Tone from 'tone';
import { InstrumentBase, midiToToneNote, normalizeVelocity } from './instrument-base';

export interface HammondOrganPreset {
  // Drawbars (0-8 for each)
  drawbars: {
    sub: number;        // 16'
    subThird: number;   // 5 1/3'
    fundamental: number; // 8'
    second: number;     // 4'
    third: number;      // 2 2/3'
    fourth: number;     // 2'
    fifth: number;      // 1 3/5'
    sixth: number;      // 1 1/3'
    eighth: number;     // 1'
  };

  // Percussion
  percussion: boolean;
  percussionVolume: 'soft' | 'normal';
  percussionDecay: 'fast' | 'slow';
  percussionHarmonic: 'second' | 'third';

  // Vibrato/Chorus
  vibratoType: 'V1' | 'V2' | 'V3' | 'C1' | 'C2' | 'C3' | 'off';

  // Leslie/Rotary speaker
  rotary: boolean;
  rotarySpeed: 'slow' | 'fast' | 'brake';

  // Output
  drive: number;
}

const DEFAULT_PRESET: HammondOrganPreset = {
  drawbars: {
    sub: 8,
    subThird: 8,
    fundamental: 8,
    second: 0,
    third: 0,
    fourth: 0,
    fifth: 0,
    sixth: 0,
    eighth: 0,
  },
  percussion: false,
  percussionVolume: 'normal',
  percussionDecay: 'fast',
  percussionHarmonic: 'third',
  vibratoType: 'C3',
  rotary: true,
  rotarySpeed: 'slow',
  drive: 0.2,
};

export const HAMMOND_PRESETS: Record<string, Partial<HammondOrganPreset>> = {
  'Full Organ': DEFAULT_PRESET,
  'Gospel': {
    drawbars: { sub: 8, subThird: 8, fundamental: 6, second: 8, third: 0, fourth: 6, fifth: 0, sixth: 5, eighth: 6 },
    percussion: true,
    percussionHarmonic: 'third',
    vibratoType: 'C3',
    rotary: true,
    rotarySpeed: 'fast',
    drive: 0.4,
  },
  'Jazz': {
    drawbars: { sub: 8, subThird: 8, fundamental: 8, second: 0, third: 0, fourth: 0, fifth: 0, sixth: 0, eighth: 0 },
    percussion: true,
    percussionVolume: 'soft',
    percussionDecay: 'fast',
    percussionHarmonic: 'second',
    vibratoType: 'C1',
    rotary: true,
    rotarySpeed: 'slow',
    drive: 0.1,
  },
  'Rock': {
    drawbars: { sub: 8, subThird: 8, fundamental: 8, second: 6, third: 0, fourth: 4, fifth: 0, sixth: 0, eighth: 0 },
    percussion: true,
    percussionHarmonic: 'third',
    vibratoType: 'off',
    rotary: true,
    rotarySpeed: 'fast',
    drive: 0.6,
  },
  'Ballad': {
    drawbars: { sub: 6, subThird: 6, fundamental: 8, second: 4, third: 0, fourth: 2, fifth: 0, sixth: 0, eighth: 0 },
    percussion: false,
    vibratoType: 'V3',
    rotary: true,
    rotarySpeed: 'slow',
    drive: 0,
  },
  'Booker T': {
    drawbars: { sub: 8, subThird: 8, fundamental: 8, second: 8, third: 0, fourth: 0, fifth: 0, sixth: 0, eighth: 0 },
    percussion: true,
    percussionVolume: 'normal',
    percussionDecay: 'fast',
    percussionHarmonic: 'second',
    vibratoType: 'C3',
    rotary: true,
    rotarySpeed: 'slow',
    drive: 0.3,
  },
  'Jimmy Smith': {
    drawbars: { sub: 8, subThird: 0, fundamental: 8, second: 0, third: 0, fourth: 0, fifth: 0, sixth: 0, eighth: 8 },
    percussion: true,
    percussionHarmonic: 'third',
    percussionDecay: 'fast',
    vibratoType: 'C3',
    rotary: true,
    rotarySpeed: 'slow',
    drive: 0.2,
  },
  'Prog Rock': {
    drawbars: { sub: 8, subThird: 8, fundamental: 8, second: 8, third: 8, fourth: 8, fifth: 8, sixth: 8, eighth: 8 },
    percussion: false,
    vibratoType: 'C2',
    rotary: true,
    rotarySpeed: 'fast',
    drive: 0.5,
  },
};

// Drawbar frequencies relative to fundamental (Hammond tonewheels)
const DRAWBAR_RATIOS = [0.5, 1.5, 1, 2, 3, 4, 5, 6, 8];

export class HammondOrgan extends InstrumentBase {
  type: 'keys' = 'keys';

  private oscillators: Map<string, Tone.Oscillator[]> = new Map();
  private ampEnvs: Map<string, Tone.AmplitudeEnvelope> = new Map();
  private percOsc: Tone.Oscillator | null = null;
  private percEnv: Tone.AmplitudeEnvelope | null = null;
  private vibrato: Tone.Vibrato;
  private chorus: Tone.Chorus;
  private rotaryLfo: Tone.LFO;
  private rotaryTremolo: Tone.Tremolo;
  private distortion: Tone.Distortion;
  private masterGain: Tone.Gain;
  private preset: HammondOrganPreset;
  private rotaryRate: number = 0.8;

  constructor(name = 'Hammond Organ') {
    super(name);
    this.preset = { ...DEFAULT_PRESET };

    // Master gain
    this.masterGain = new Tone.Gain(0.3);

    // Vibrato (for V settings)
    this.vibrato = new Tone.Vibrato({
      frequency: 7,
      depth: 0,
    });

    // Chorus (for C settings - scanner vibrato simulation)
    this.chorus = new Tone.Chorus({
      frequency: 7,
      depth: 0.3,
      wet: 0,
    }).start();

    // Rotary speaker simulation
    this.rotaryLfo = new Tone.LFO({
      frequency: this.rotaryRate,
      min: -100,
      max: 100,
    }).start();

    this.rotaryTremolo = new Tone.Tremolo({
      frequency: this.rotaryRate * 1.2,
      depth: 0.3,
    }).start();

    // Distortion (tube amp simulation)
    this.distortion = new Tone.Distortion({
      distortion: this.preset.drive,
      wet: this.preset.drive > 0 ? 1 : 0,
    });

    // Connect effects chain
    this.masterGain.connect(this.vibrato);
    this.vibrato.connect(this.chorus);
    this.chorus.connect(this.rotaryTremolo);
    this.rotaryTremolo.connect(this.distortion);
    this.distortion.connect(this.output);

    this.updateVibratoType();
    this.updateRotarySpeed();
  }

  private updateVibratoType(): void {
    switch (this.preset.vibratoType) {
      case 'V1':
        this.vibrato.depth.value = 0.02;
        this.chorus.wet.value = 0;
        break;
      case 'V2':
        this.vibrato.depth.value = 0.04;
        this.chorus.wet.value = 0;
        break;
      case 'V3':
        this.vibrato.depth.value = 0.06;
        this.chorus.wet.value = 0;
        break;
      case 'C1':
        this.vibrato.depth.value = 0;
        this.chorus.wet.value = 0.2;
        break;
      case 'C2':
        this.vibrato.depth.value = 0;
        this.chorus.wet.value = 0.4;
        break;
      case 'C3':
        this.vibrato.depth.value = 0;
        this.chorus.wet.value = 0.6;
        break;
      case 'off':
      default:
        this.vibrato.depth.value = 0;
        this.chorus.wet.value = 0;
    }
  }

  private updateRotarySpeed(): void {
    if (!this.preset.rotary) {
      this.rotaryTremolo.depth.value = 0;
      return;
    }

    switch (this.preset.rotarySpeed) {
      case 'slow':
        this.rotaryRate = 0.8;
        this.rotaryTremolo.depth.value = 0.25;
        break;
      case 'fast':
        this.rotaryRate = 6.5;
        this.rotaryTremolo.depth.value = 0.4;
        break;
      case 'brake':
        this.rotaryRate = 0.2;
        this.rotaryTremolo.depth.value = 0.15;
        break;
    }

    this.rotaryLfo.frequency.value = this.rotaryRate;
    this.rotaryTremolo.frequency.value = this.rotaryRate * 1.2;
  }

  triggerAttack(note: string | number, time?: number, velocity = 100): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = normalizeVelocity(velocity);
    const t = time ?? Tone.now();
    const baseFreq = Tone.Frequency(noteStr).toFrequency();

    // Create oscillators for each drawbar
    const oscs: Tone.Oscillator[] = [];
    const drawbarValues = Object.values(this.preset.drawbars);

    for (let i = 0; i < 9; i++) {
      const level = drawbarValues[i] / 8;
      if (level > 0) {
        const freq = baseFreq * DRAWBAR_RATIOS[i];
        const osc = new Tone.Oscillator({
          frequency: freq,
          type: 'sine',
          volume: Tone.gainToDb(level * 0.3),
        });
        oscs.push(osc);
      }
    }

    // Create envelope
    const env = new Tone.AmplitudeEnvelope({
      attack: 0.005,
      decay: 0.1,
      sustain: 1,
      release: 0.1,
    });

    // Connect all oscillators through envelope
    oscs.forEach(osc => {
      osc.connect(env);
      osc.start(t);
    });
    env.connect(this.masterGain);
    env.triggerAttack(t, vel);

    // Store references
    this.oscillators.set(noteStr, oscs);
    this.ampEnvs.set(noteStr, env);

    // Handle percussion
    if (this.preset.percussion && this.oscillators.size === 1) {
      this.triggerPercussion(baseFreq, t, vel);
    }
  }

  private triggerPercussion(baseFreq: number, time: number, velocity: number): void {
    const harmonic = this.preset.percussionHarmonic === 'second' ? 2 : 3;
    const decayTime = this.preset.percussionDecay === 'fast' ? 0.15 : 0.5;
    const volume = this.preset.percussionVolume === 'soft' ? 0.3 : 0.6;

    this.percOsc = new Tone.Oscillator({
      frequency: baseFreq * harmonic,
      type: 'sine',
    });

    this.percEnv = new Tone.AmplitudeEnvelope({
      attack: 0.001,
      decay: decayTime,
      sustain: 0,
      release: 0.01,
    });

    this.percOsc.connect(this.percEnv);
    this.percEnv.connect(this.masterGain);

    this.percOsc.start(time);
    this.percEnv.triggerAttack(time, velocity * volume);

    // Clean up percussion after decay
    setTimeout(() => {
      if (this.percOsc) {
        this.percOsc.dispose();
        this.percOsc = null;
      }
      if (this.percEnv) {
        this.percEnv.dispose();
        this.percEnv = null;
      }
    }, decayTime * 1000 + 100);
  }

  triggerRelease(note: string | number, time?: number): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const t = time ?? Tone.now();

    const env = this.ampEnvs.get(noteStr);
    if (env) {
      env.triggerRelease(t);

      // Clean up after release
      setTimeout(() => {
        const oscs = this.oscillators.get(noteStr);
        if (oscs) {
          oscs.forEach(osc => osc.dispose());
          this.oscillators.delete(noteStr);
        }
        env.dispose();
        this.ampEnvs.delete(noteStr);
      }, 200);
    }
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
    for (const noteStr of this.ampEnvs.keys()) {
      this.triggerRelease(noteStr, t);
    }
  }

  setRotarySpeed(speed: 'slow' | 'fast' | 'brake'): void {
    this.preset.rotarySpeed = speed;
    this.updateRotarySpeed();
  }

  toggleRotary(): void {
    this.preset.rotary = !this.preset.rotary;
    this.updateRotarySpeed();
  }

  loadPreset(params: Record<string, unknown>): void {
    this.preset = { ...DEFAULT_PRESET, ...params as Partial<HammondOrganPreset> };
    this.updateVibratoType();
    this.updateRotarySpeed();
    this.distortion.distortion = this.preset.drive;
    this.distortion.wet.value = this.preset.drive > 0 ? 1 : 0;
  }

  getPreset(): Record<string, unknown> {
    return { ...this.preset };
  }

  dispose(): void {
    // Clean up all active notes
    for (const oscs of this.oscillators.values()) {
      oscs.forEach(osc => osc.dispose());
    }
    for (const env of this.ampEnvs.values()) {
      env.dispose();
    }
    this.oscillators.clear();
    this.ampEnvs.clear();

    if (this.percOsc) this.percOsc.dispose();
    if (this.percEnv) this.percEnv.dispose();

    this.vibrato.dispose();
    this.chorus.dispose();
    this.rotaryLfo.dispose();
    this.rotaryTremolo.dispose();
    this.distortion.dispose();
    this.masterGain.dispose();
    super.dispose();
  }
}
