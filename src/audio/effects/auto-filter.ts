import * as Tone from 'tone';

export interface AutoFilterOptions {
  frequency: number;      // LFO rate in Hz (or note value)
  depth: number;          // Modulation depth 0-1
  baseFrequency: number;  // Base filter frequency
  octaves: number;        // Range of sweep in octaves
  type: BiquadFilterType; // Filter type
  resonance: number;      // Filter Q/resonance
  wet: number;            // Dry/wet mix
  sync: boolean;          // Sync to tempo
}

const DEFAULT_OPTIONS: AutoFilterOptions = {
  frequency: 1,
  depth: 1,
  baseFrequency: 200,
  octaves: 4,
  type: 'lowpass',
  resonance: 2,
  wet: 1,
  sync: false,
};

/**
 * Auto-Filter Effect
 * LFO-modulated filter for sweeps, wobbles, and rhythmic effects
 */
export class AutoFilterEffect {
  private autoFilter: Tone.AutoFilter;
  private input: Tone.Gain;
  private output: Tone.Gain;
  private dryGain: Tone.Gain;
  private wetGain: Tone.Gain;
  private options: AutoFilterOptions;

  constructor(options: Partial<AutoFilterOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);
    this.dryGain = new Tone.Gain(1 - this.options.wet);
    this.wetGain = new Tone.Gain(this.options.wet);

    this.autoFilter = new Tone.AutoFilter({
      frequency: this.options.frequency,
      depth: this.options.depth,
      baseFrequency: this.options.baseFrequency,
      octaves: this.options.octaves,
    }).start();

    // Set filter type and Q separately
    this.autoFilter.filter.type = this.options.type;
    this.autoFilter.filter.Q.value = this.options.resonance;

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Wet path
    this.input.connect(this.autoFilter);
    this.autoFilter.connect(this.wetGain);
    this.wetGain.connect(this.output);
  }

  getInput(): Tone.Gain {
    return this.input;
  }

  getOutput(): Tone.Gain {
    return this.output;
  }

  set frequency(value: number) {
    this.options.frequency = value;
    this.autoFilter.frequency.value = value;
  }

  set depth(value: number) {
    this.options.depth = value;
    this.autoFilter.depth.value = value;
  }

  set baseFrequency(value: number) {
    this.options.baseFrequency = value;
    this.autoFilter.baseFrequency = value;
  }

  set octaves(value: number) {
    this.options.octaves = value;
    this.autoFilter.octaves = value;
  }

  set type(value: BiquadFilterType) {
    this.options.type = value;
    this.autoFilter.filter.type = value;
  }

  set resonance(value: number) {
    this.options.resonance = value;
    this.autoFilter.filter.Q.value = value;
  }

  set wet(value: number) {
    this.options.wet = value;
    this.dryGain.gain.value = 1 - value;
    this.wetGain.gain.value = value;
  }

  /**
   * Sync the LFO to a specific note value
   */
  syncToTempo(noteValue: string): void {
    this.options.sync = true;
    this.autoFilter.frequency.value = noteValue as any;
  }

  /**
   * Set LFO waveform type
   */
  setWaveform(type: 'sine' | 'square' | 'triangle' | 'sawtooth'): void {
    this.autoFilter.type = type;
  }

  getOptions(): AutoFilterOptions {
    return { ...this.options };
  }

  setOptions(options: Partial<AutoFilterOptions>): void {
    if (options.frequency !== undefined) this.frequency = options.frequency;
    if (options.depth !== undefined) this.depth = options.depth;
    if (options.baseFrequency !== undefined) this.baseFrequency = options.baseFrequency;
    if (options.octaves !== undefined) this.octaves = options.octaves;
    if (options.type !== undefined) this.type = options.type;
    if (options.resonance !== undefined) this.resonance = options.resonance;
    if (options.wet !== undefined) this.wet = options.wet;
  }

  connect(destination: Tone.InputNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.output.disconnect();
  }

  dispose(): void {
    this.autoFilter.stop();
    this.input.dispose();
    this.output.dispose();
    this.dryGain.dispose();
    this.wetGain.dispose();
    this.autoFilter.dispose();
  }
}

// Auto-filter presets
export const AUTO_FILTER_PRESETS: Record<string, Partial<AutoFilterOptions>> = {
  'Slow Sweep': { frequency: 0.1, depth: 1, baseFrequency: 100, octaves: 5, type: 'lowpass', resonance: 4 },
  'Fast Wobble': { frequency: 4, depth: 1, baseFrequency: 200, octaves: 4, type: 'lowpass', resonance: 6 },
  'Dubstep Wobble': { frequency: 2, depth: 1, baseFrequency: 100, octaves: 5, type: 'lowpass', resonance: 8 },
  'Trance Gate': { frequency: 8, depth: 1, baseFrequency: 500, octaves: 3, type: 'lowpass', resonance: 3 },
  'Funky Wah': { frequency: 1.5, depth: 0.8, baseFrequency: 300, octaves: 3, type: 'bandpass', resonance: 10 },
  'Subtle': { frequency: 0.2, depth: 0.5, baseFrequency: 400, octaves: 2, type: 'lowpass', resonance: 2 },
  'Resonant Sweep': { frequency: 0.5, depth: 1, baseFrequency: 150, octaves: 4, type: 'lowpass', resonance: 12 },
  'High Pass Sweep': { frequency: 0.3, depth: 1, baseFrequency: 100, octaves: 4, type: 'highpass', resonance: 4 },
};
