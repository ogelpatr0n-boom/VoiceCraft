import * as Tone from 'tone';

export interface FlangerOptions {
  frequency: number;      // LFO rate in Hz
  depth: number;          // Modulation depth 0-1
  delay: number;          // Base delay time in seconds
  feedback: number;       // Feedback amount -1 to 1
  wet: number;            // Dry/wet mix 0-1
}

const DEFAULT_OPTIONS: FlangerOptions = {
  frequency: 0.5,
  depth: 0.5,
  delay: 0.005,
  feedback: 0.5,
  wet: 0.5,
};

/**
 * Flanger Effect
 * Creates the classic jet-plane swooshing effect
 */
export class FlangerEffect {
  private input: Tone.Gain;
  private output: Tone.Gain;
  private dryGain: Tone.Gain;
  private wetGain: Tone.Gain;
  private delayNode: Tone.Delay;
  private lfo: Tone.LFO;
  private lfoGain: Tone.Gain;
  private feedbackNode: Tone.Gain;
  private options: FlangerOptions;

  constructor(options: Partial<FlangerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);
    this.dryGain = new Tone.Gain(1 - this.options.wet);
    this.wetGain = new Tone.Gain(this.options.wet);

    // Short delay line
    this.delayNode = new Tone.Delay({
      delayTime: this.options.delay,
      maxDelay: 0.02,
    });

    // LFO for modulating delay time
    this.lfo = new Tone.LFO({
      frequency: this.options.frequency,
      min: 0.001,
      max: this.options.delay * 2,
    }).start();

    this.lfoGain = new Tone.Gain(this.options.depth);

    // Feedback path
    this.feedbackNode = new Tone.Gain(this.options.feedback);

    // Connect LFO to delay time
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delayNode.delayTime);

    // Signal routing
    // Dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Wet path
    this.input.connect(this.delayNode);
    this.delayNode.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Feedback
    this.delayNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);
  }

  getInput(): Tone.Gain {
    return this.input;
  }

  getOutput(): Tone.Gain {
    return this.output;
  }

  set frequency(value: number) {
    this.options.frequency = value;
    this.lfo.frequency.value = value;
  }

  set depth(value: number) {
    this.options.depth = value;
    this.lfoGain.gain.value = value;
    this.lfo.max = this.options.delay * (1 + value);
  }

  set delayTime(value: number) {
    this.options.delay = value;
    this.delayNode.delayTime.value = value;
    this.lfo.max = value * (1 + this.options.depth);
  }

  set feedbackAmount(value: number) {
    this.options.feedback = Math.max(-0.95, Math.min(0.95, value));
    this.feedbackNode.gain.value = this.options.feedback;
  }

  set wet(value: number) {
    this.options.wet = value;
    this.dryGain.gain.value = 1 - value;
    this.wetGain.gain.value = value;
  }

  getOptions(): FlangerOptions {
    return { ...this.options };
  }

  setOptions(options: Partial<FlangerOptions>): void {
    if (options.frequency !== undefined) this.frequency = options.frequency;
    if (options.depth !== undefined) this.depth = options.depth;
    if (options.delay !== undefined) this.delayTime = options.delay;
    if (options.feedback !== undefined) this.feedbackAmount = options.feedback;
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
    this.delayNode.dispose();
    this.lfo.dispose();
    this.lfoGain.dispose();
    this.feedbackNode.dispose();
  }
}

// Flanger presets
export const FLANGER_PRESETS: Record<string, Partial<FlangerOptions>> = {
  'Classic Jet': { frequency: 0.2, depth: 0.7, delay: 0.005, feedback: 0.7, wet: 0.5 },
  'Fast Flange': { frequency: 2, depth: 0.5, delay: 0.003, feedback: 0.5, wet: 0.4 },
  'Metallic': { frequency: 0.5, depth: 0.8, delay: 0.002, feedback: 0.85, wet: 0.6 },
  'Subtle': { frequency: 0.3, depth: 0.3, delay: 0.004, feedback: 0.3, wet: 0.3 },
  'Chorus-like': { frequency: 0.8, depth: 0.4, delay: 0.007, feedback: 0.2, wet: 0.4 },
  'Negative': { frequency: 0.4, depth: 0.6, delay: 0.005, feedback: -0.7, wet: 0.5 },
};
