import * as Tone from 'tone';
import { InstrumentBase, midiToToneNote, normalizeVelocity } from './instrument-base';

// Wavetable definitions - each is an array of partials
const WAVETABLES = {
  basic: {
    sine: [1],
    triangle: [1, 0, 1/9, 0, 1/25, 0, 1/49],
    saw: [1, 0.5, 0.33, 0.25, 0.2, 0.167, 0.143, 0.125],
    square: [1, 0, 0.33, 0, 0.2, 0, 0.143, 0],
    pulse: [1, 0.8, 0.6, 0.4, 0.3, 0.2, 0.15, 0.1],
  },
  digital: {
    digital1: [1, 0.7, 0.5, 0.3, 0.8, 0.2, 0.6, 0.1],
    digital2: [1, 0, 0.8, 0, 0.6, 0, 0.9, 0],
    digital3: [0.5, 1, 0.3, 0.8, 0.2, 0.6, 0.4, 0.3],
    metallic: [1, 0.3, 0.7, 0.2, 0.9, 0.1, 0.5, 0.4],
    harsh: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3],
  },
  organic: {
    vocal: [1, 0.4, 0.2, 0.6, 0.1, 0.3, 0.05, 0.15],
    breath: [0.3, 0.5, 0.8, 0.4, 0.6, 0.2, 0.1, 0.05],
    formant: [1, 0.2, 0.5, 0.1, 0.8, 0.05, 0.3, 0.02],
    choir: [1, 0.6, 0.3, 0.5, 0.2, 0.4, 0.15, 0.25],
  },
};

export interface WavetableSynthPreset {
  // Oscillator 1
  osc1Wavetable: string;
  osc1Position: number; // 0-1, morphs through wavetable
  osc1Octave: number;
  osc1Semi: number;
  osc1Fine: number;

  // Oscillator 2
  osc2Wavetable: string;
  osc2Position: number;
  osc2Octave: number;
  osc2Semi: number;
  osc2Fine: number;
  osc2Mix: number;

  // Filter
  filterType: 'lowpass' | 'highpass' | 'bandpass';
  filterFreq: number;
  filterRes: number;
  filterEnvAmount: number;

  // Filter envelope
  filterAttack: number;
  filterDecay: number;
  filterSustain: number;
  filterRelease: number;

  // Amp envelope
  attack: number;
  decay: number;
  sustain: number;
  release: number;

  // Modulation
  lfoRate: number;
  lfoToPitch: number;
  lfoToFilter: number;

  // Effects
  unison: number;
  unisonSpread: number;
}

const DEFAULT_PRESET: WavetableSynthPreset = {
  osc1Wavetable: 'saw',
  osc1Position: 0,
  osc1Octave: 0,
  osc1Semi: 0,
  osc1Fine: 0,

  osc2Wavetable: 'square',
  osc2Position: 0,
  osc2Octave: 0,
  osc2Semi: 0,
  osc2Fine: 7,
  osc2Mix: 0.5,

  filterType: 'lowpass',
  filterFreq: 5000,
  filterRes: 1,
  filterEnvAmount: 2000,

  filterAttack: 0.01,
  filterDecay: 0.3,
  filterSustain: 0.5,
  filterRelease: 0.5,

  attack: 0.01,
  decay: 0.2,
  sustain: 0.7,
  release: 0.5,

  lfoRate: 0.5,
  lfoToPitch: 0,
  lfoToFilter: 0,

  unison: 1,
  unisonSpread: 10,
};

export const WAVETABLE_PRESETS: Record<string, Partial<WavetableSynthPreset>> = {
  'Init': DEFAULT_PRESET,
  'Super Saw': {
    osc1Wavetable: 'saw',
    osc2Wavetable: 'saw',
    osc2Fine: 12,
    osc2Mix: 0.8,
    filterFreq: 8000,
    filterRes: 0.5,
    unison: 4,
    unisonSpread: 20,
  },
  'Digital Lead': {
    osc1Wavetable: 'digital1',
    osc2Wavetable: 'digital2',
    osc2Mix: 0.6,
    filterFreq: 4000,
    filterRes: 3,
    filterEnvAmount: 3000,
    filterDecay: 0.2,
  },
  'Warm Pad': {
    osc1Wavetable: 'triangle',
    osc2Wavetable: 'sine',
    osc2Fine: 5,
    osc2Mix: 0.7,
    filterFreq: 2000,
    attack: 0.5,
    decay: 0.5,
    sustain: 0.8,
    release: 1.5,
    lfoRate: 0.3,
    lfoToFilter: 300,
  },
  'Metallic': {
    osc1Wavetable: 'metallic',
    osc2Wavetable: 'harsh',
    osc2Semi: 7,
    osc2Mix: 0.4,
    filterFreq: 6000,
    filterRes: 4,
    attack: 0.001,
    decay: 0.4,
    sustain: 0.3,
  },
  'Vocal Synth': {
    osc1Wavetable: 'vocal',
    osc2Wavetable: 'formant',
    osc2Mix: 0.5,
    filterFreq: 3000,
    filterRes: 2,
    filterEnvAmount: 1500,
    lfoRate: 5,
    lfoToFilter: 200,
  },
  'Pluck Lead': {
    osc1Wavetable: 'saw',
    osc2Wavetable: 'pulse',
    osc2Mix: 0.3,
    filterFreq: 8000,
    filterEnvAmount: 5000,
    filterDecay: 0.15,
    filterSustain: 0.1,
    attack: 0.001,
    decay: 0.3,
    sustain: 0.2,
    release: 0.3,
  },
  'Thick Bass': {
    osc1Wavetable: 'saw',
    osc1Octave: -1,
    osc2Wavetable: 'square',
    osc2Octave: -1,
    osc2Mix: 0.6,
    filterFreq: 800,
    filterRes: 2,
    filterEnvAmount: 600,
    filterDecay: 0.2,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.5,
  },
  'Ambient': {
    osc1Wavetable: 'breath',
    osc2Wavetable: 'choir',
    osc2Fine: 3,
    osc2Mix: 0.7,
    filterFreq: 1500,
    attack: 1,
    decay: 1,
    sustain: 0.6,
    release: 3,
    lfoRate: 0.1,
    lfoToPitch: 5,
    lfoToFilter: 400,
  },
};

export class WavetableSynth extends InstrumentBase {
  type: 'synth' = 'synth';

  private synth1: Tone.PolySynth;
  private synth2: Tone.PolySynth;
  private filter: Tone.Filter;
  private filterEnv: Tone.FrequencyEnvelope;
  private lfo: Tone.LFO;
  private lfoGain: Tone.Gain;
  private mixer: Tone.Gain;
  private preset: WavetableSynthPreset;

  constructor(name = 'Wavetable Synth') {
    super(name);
    this.preset = { ...DEFAULT_PRESET };

    // Create two oscillator banks
    this.synth1 = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: this.preset.attack,
        decay: this.preset.decay,
        sustain: this.preset.sustain,
        release: this.preset.release,
      },
    });

    this.synth2 = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: {
        attack: this.preset.attack,
        decay: this.preset.decay,
        sustain: this.preset.sustain,
        release: this.preset.release,
      },
      detune: this.preset.osc2Fine,
    });

    // Mixer for oscillators
    this.mixer = new Tone.Gain(0.5);

    // Filter
    this.filter = new Tone.Filter({
      type: this.preset.filterType,
      frequency: this.preset.filterFreq,
      Q: this.preset.filterRes,
    });

    // Filter envelope
    this.filterEnv = new Tone.FrequencyEnvelope({
      attack: this.preset.filterAttack,
      decay: this.preset.filterDecay,
      sustain: this.preset.filterSustain,
      release: this.preset.filterRelease,
      baseFrequency: this.preset.filterFreq,
      octaves: Math.log2((this.preset.filterFreq + this.preset.filterEnvAmount) / this.preset.filterFreq),
    });
    this.filterEnv.connect(this.filter.frequency);

    // LFO
    this.lfo = new Tone.LFO({
      frequency: this.preset.lfoRate,
      min: -1,
      max: 1,
    }).start();

    this.lfoGain = new Tone.Gain(this.preset.lfoToFilter);
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);

    // Connect signal chain
    const osc1Gain = new Tone.Gain(1 - this.preset.osc2Mix);
    const osc2Gain = new Tone.Gain(this.preset.osc2Mix);

    this.synth1.connect(osc1Gain);
    this.synth2.connect(osc2Gain);
    osc1Gain.connect(this.mixer);
    osc2Gain.connect(this.mixer);
    this.mixer.connect(this.filter);
    this.filter.connect(this.output);
  }

  private getWaveformType(wavetableName: string): OscillatorType {
    // Map wavetable names to Tone.js oscillator types
    const mapping: Record<string, OscillatorType> = {
      sine: 'sine',
      triangle: 'triangle',
      saw: 'sawtooth',
      square: 'square',
      pulse: 'square',
      // For custom wavetables, default to sawtooth with harmonics
      digital1: 'sawtooth',
      digital2: 'square',
      digital3: 'sawtooth',
      metallic: 'sawtooth',
      harsh: 'sawtooth',
      vocal: 'sine',
      breath: 'triangle',
      formant: 'sine',
      choir: 'triangle',
    };
    return mapping[wavetableName] || 'sawtooth';
  }

  triggerAttack(note: string | number, time?: number, velocity = 100): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const vel = normalizeVelocity(velocity);
    const t = time ?? Tone.now();

    // Apply octave/semitone offsets
    const note1 = Tone.Frequency(noteStr)
      .transpose(this.preset.osc1Octave * 12 + this.preset.osc1Semi)
      .toNote();
    const note2 = Tone.Frequency(noteStr)
      .transpose(this.preset.osc2Octave * 12 + this.preset.osc2Semi)
      .toNote();

    this.synth1.triggerAttack(note1, t, vel);
    this.synth2.triggerAttack(note2, t, vel * this.preset.osc2Mix);
    this.filterEnv.triggerAttack(t);
  }

  triggerRelease(note: string | number, time?: number): void {
    const noteStr = typeof note === 'number' ? midiToToneNote(note) : note;
    const t = time ?? Tone.now();

    const note1 = Tone.Frequency(noteStr)
      .transpose(this.preset.osc1Octave * 12 + this.preset.osc1Semi)
      .toNote();
    const note2 = Tone.Frequency(noteStr)
      .transpose(this.preset.osc2Octave * 12 + this.preset.osc2Semi)
      .toNote();

    this.synth1.triggerRelease(note1, t);
    this.synth2.triggerRelease(note2, t);
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
    const dur = Tone.Time(duration).toSeconds();

    const note1 = Tone.Frequency(noteStr)
      .transpose(this.preset.osc1Octave * 12 + this.preset.osc1Semi)
      .toNote();
    const note2 = Tone.Frequency(noteStr)
      .transpose(this.preset.osc2Octave * 12 + this.preset.osc2Semi)
      .toNote();

    this.synth1.triggerAttackRelease(note1, dur, t, vel);
    this.synth2.triggerAttackRelease(note2, dur, t, vel * this.preset.osc2Mix);
    this.filterEnv.triggerAttack(t);
    this.filterEnv.triggerRelease(t + dur);
  }

  releaseAll(time?: number): void {
    this.synth1.releaseAll(time);
    this.synth2.releaseAll(time);
    this.filterEnv.triggerRelease(time);
  }

  loadPreset(params: Record<string, unknown>): void {
    this.preset = { ...DEFAULT_PRESET, ...params as Partial<WavetableSynthPreset> };

    // Update oscillators
    this.synth1.set({
      oscillator: { type: this.getWaveformType(this.preset.osc1Wavetable) },
      envelope: {
        attack: this.preset.attack,
        decay: this.preset.decay,
        sustain: this.preset.sustain,
        release: this.preset.release,
      },
      detune: this.preset.osc1Fine,
    });

    this.synth2.set({
      oscillator: { type: this.getWaveformType(this.preset.osc2Wavetable) },
      envelope: {
        attack: this.preset.attack,
        decay: this.preset.decay,
        sustain: this.preset.sustain,
        release: this.preset.release,
      },
      detune: this.preset.osc2Fine + this.preset.osc2Semi * 100,
    });

    // Update filter
    this.filter.type = this.preset.filterType;
    this.filter.frequency.value = this.preset.filterFreq;
    this.filter.Q.value = this.preset.filterRes;

    this.filterEnv.attack = this.preset.filterAttack;
    this.filterEnv.decay = this.preset.filterDecay;
    this.filterEnv.sustain = this.preset.filterSustain;
    this.filterEnv.release = this.preset.filterRelease;
    this.filterEnv.baseFrequency = this.preset.filterFreq;
    this.filterEnv.octaves = Math.log2((this.preset.filterFreq + this.preset.filterEnvAmount) / this.preset.filterFreq);

    // Update LFO
    this.lfo.frequency.value = this.preset.lfoRate;
    this.lfoGain.gain.value = this.preset.lfoToFilter;
  }

  getPreset(): Record<string, unknown> {
    return { ...this.preset };
  }

  dispose(): void {
    this.synth1.dispose();
    this.synth2.dispose();
    this.filter.dispose();
    this.filterEnv.dispose();
    this.lfo.dispose();
    this.lfoGain.dispose();
    this.mixer.dispose();
    super.dispose();
  }
}
