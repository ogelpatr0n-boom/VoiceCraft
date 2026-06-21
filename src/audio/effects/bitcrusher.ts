import * as Tone from 'tone';

export interface BitcrusherOptions {
  bits: number;           // Bit depth (1-16)
  sampleRate: number;     // Sample rate reduction factor
  wet: number;            // Dry/wet mix 0-1
}

const DEFAULT_OPTIONS: BitcrusherOptions = {
  bits: 8,
  sampleRate: 0.5,
  wet: 1,
};

/**
 * Bitcrusher Effect
 * Reduces bit depth and sample rate for lo-fi, retro sounds
 */
export class BitcrusherEffect {
  private bitcrusher: Tone.BitCrusher;
  private input: Tone.Gain;
  private output: Tone.Gain;
  private dryGain: Tone.Gain;
  private wetGain: Tone.Gain;
  private options: BitcrusherOptions;

  constructor(options: Partial<BitcrusherOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);
    this.dryGain = new Tone.Gain(1 - this.options.wet);
    this.wetGain = new Tone.Gain(this.options.wet);

    this.bitcrusher = new Tone.BitCrusher({
      bits: this.options.bits,
    });

    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Wet path
    this.input.connect(this.bitcrusher);
    this.bitcrusher.connect(this.wetGain);
    this.wetGain.connect(this.output);
  }

  getInput(): Tone.Gain {
    return this.input;
  }

  getOutput(): Tone.Gain {
    return this.output;
  }

  set bits(value: number) {
    this.options.bits = Math.max(1, Math.min(16, Math.floor(value)));
    this.bitcrusher.bits.value = this.options.bits;
  }

  set sampleRate(value: number) {
    this.options.sampleRate = value;
    // Note: Tone.js BitCrusher doesn't have sample rate reduction
    // We could implement this with a custom worklet, but for now
    // we'll just store the value
  }

  set wet(value: number) {
    this.options.wet = value;
    this.dryGain.gain.value = 1 - value;
    this.wetGain.gain.value = value;
  }

  getOptions(): BitcrusherOptions {
    return { ...this.options };
  }

  setOptions(options: Partial<BitcrusherOptions>): void {
    if (options.bits !== undefined) this.bits = options.bits;
    if (options.sampleRate !== undefined) this.sampleRate = options.sampleRate;
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
    this.dryGain.dispose();
    this.wetGain.dispose();
    this.bitcrusher.dispose();
  }
}

// Bitcrusher presets
export const BITCRUSHER_PRESETS: Record<string, Partial<BitcrusherOptions>> = {
  'Subtle': { bits: 12, sampleRate: 0.8, wet: 0.3 },
  '8-bit': { bits: 8, sampleRate: 0.5, wet: 1 },
  '4-bit': { bits: 4, sampleRate: 0.3, wet: 1 },
  'Extreme': { bits: 2, sampleRate: 0.1, wet: 1 },
  'Lo-Fi': { bits: 10, sampleRate: 0.6, wet: 0.5 },
  'Telephone': { bits: 6, sampleRate: 0.4, wet: 0.8 },
};
