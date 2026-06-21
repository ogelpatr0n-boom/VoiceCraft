import * as Tone from 'tone';

export interface PhaserOptions {
  frequency: number;      // LFO rate in Hz
  depth: number;          // Modulation depth 0-1
  stages: number;         // Number of allpass stages (4, 6, 8, 12)
  feedback: number;       // Feedback amount 0-1
  baseFrequency: number;  // Base frequency for sweep
  wet: number;            // Dry/wet mix 0-1
}

const DEFAULT_OPTIONS: PhaserOptions = {
  frequency: 0.5,
  depth: 0.5,
  stages: 6,
  feedback: 0.5,
  baseFrequency: 350,
  wet: 0.5,
};

/**
 * Phaser Effect
 * Classic phase shifting effect using cascaded allpass filters
 */
export class PhaserEffect {
  private phaser: Tone.Phaser;
  private input: Tone.Gain;
  private output: Tone.Gain;
  private options: PhaserOptions;

  constructor(options: Partial<PhaserOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);

    this.phaser = new Tone.Phaser({
      frequency: this.options.frequency,
      octaves: this.options.depth * 3,
      stages: this.options.stages as 4 | 6 | 8 | 10 | 12,
      Q: this.options.feedback * 10,
      baseFrequency: this.options.baseFrequency,
      wet: this.options.wet,
    });

    this.input.connect(this.phaser);
    this.phaser.connect(this.output);
  }

  getInput(): Tone.Gain {
    return this.input;
  }

  getOutput(): Tone.Gain {
    return this.output;
  }

  // Setters
  set frequency(value: number) {
    this.options.frequency = value;
    this.phaser.frequency.value = value;
  }

  set depth(value: number) {
    this.options.depth = value;
    this.phaser.octaves = value * 3;
  }

  set feedback(value: number) {
    this.options.feedback = value;
    this.phaser.Q.value = value * 10;
  }

  set baseFrequency(value: number) {
    this.options.baseFrequency = value;
    this.phaser.baseFrequency = value;
  }

  set wet(value: number) {
    this.options.wet = value;
    this.phaser.wet.value = value;
  }

  getOptions(): PhaserOptions {
    return { ...this.options };
  }

  setOptions(options: Partial<PhaserOptions>): void {
    if (options.frequency !== undefined) this.frequency = options.frequency;
    if (options.depth !== undefined) this.depth = options.depth;
    if (options.feedback !== undefined) this.feedback = options.feedback;
    if (options.baseFrequency !== undefined) this.baseFrequency = options.baseFrequency;
    if (options.wet !== undefined) this.wet = options.wet;
  }

  connect(destination: Tone.InputNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.output.disconnect();
  }

  dispose(): void {
    this.input.dispose();
    this.output.dispose();
    this.phaser.dispose();
  }
}

// Phaser presets
export const PHASER_PRESETS: Record<string, Partial<PhaserOptions>> = {
  'Slow Sweep': { frequency: 0.2, depth: 0.6, feedback: 0.4, wet: 0.5 },
  'Fast Wobble': { frequency: 4, depth: 0.4, feedback: 0.3, wet: 0.4 },
  'Deep Phase': { frequency: 0.5, depth: 0.8, feedback: 0.7, wet: 0.6 },
  'Subtle': { frequency: 0.3, depth: 0.3, feedback: 0.2, wet: 0.3 },
  'Resonant': { frequency: 0.8, depth: 0.5, feedback: 0.85, wet: 0.5 },
  'Synth Lead': { frequency: 1.5, depth: 0.6, feedback: 0.5, wet: 0.4 },
};
