import * as Tone from 'tone';

export interface GateOptions {
  threshold: number;      // Threshold in dB
  smoothing: number;      // Smoothing time in seconds
  range: number;          // Gating range in dB (how much to attenuate)
}

const DEFAULT_OPTIONS: GateOptions = {
  threshold: -40,
  smoothing: 0.1,
  range: -80,
};

/**
 * Noise Gate Effect
 * Attenuates signal below threshold - useful for removing noise
 * and creating rhythmic chopping effects
 */
export class GateEffect {
  private gate: Tone.Gate;
  private input: Tone.Gain;
  private output: Tone.Gain;
  private options: GateOptions;

  constructor(options: Partial<GateOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);

    this.gate = new Tone.Gate(this.options.threshold, this.options.smoothing);

    this.input.connect(this.gate);
    this.gate.connect(this.output);
  }

  getInput(): Tone.Gain {
    return this.input;
  }

  getOutput(): Tone.Gain {
    return this.output;
  }

  set threshold(value: number) {
    this.options.threshold = value;
    this.gate.threshold = value;
  }

  set smoothing(value: number) {
    this.options.smoothing = value;
    this.gate.smoothing = value;
  }

  getOptions(): GateOptions {
    return { ...this.options };
  }

  setOptions(options: Partial<GateOptions>): void {
    if (options.threshold !== undefined) this.threshold = options.threshold;
    if (options.smoothing !== undefined) this.smoothing = options.smoothing;
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
    this.gate.dispose();
  }
}

/**
 * Rhythmic Gate / Trance Gate
 * Creates rhythmic chopping patterns synced to tempo
 */
export class RhythmicGate {
  private input: Tone.Gain;
  private output: Tone.Gain;
  private gateGain: Tone.Gain;
  private pattern: number[] = [1, 0, 1, 0, 1, 0, 1, 0];
  private stepIndex: number = 0;
  private intervalId: number | null = null;
  private bpm: number = 120;
  private subdivision: number = 8; // Steps per beat

  constructor() {
    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);
    this.gateGain = new Tone.Gain(1);

    this.input.connect(this.gateGain);
    this.gateGain.connect(this.output);
  }

  getInput(): Tone.Gain {
    return this.input;
  }

  getOutput(): Tone.Gain {
    return this.output;
  }

  /**
   * Set the gate pattern (array of 0s and 1s)
   */
  setPattern(pattern: number[]): void {
    this.pattern = pattern;
  }

  /**
   * Start the rhythmic gating
   */
  start(bpm: number = 120): void {
    this.stop();
    this.bpm = bpm;
    this.stepIndex = 0;

    const stepDuration = (60 / bpm / this.subdivision) * 1000;

    this.intervalId = window.setInterval(() => {
      const gateValue = this.pattern[this.stepIndex % this.pattern.length];
      this.gateGain.gain.setTargetAtTime(
        gateValue,
        Tone.now(),
        0.005
      );
      this.stepIndex++;
    }, stepDuration);
  }

  /**
   * Stop the rhythmic gating
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.gateGain.gain.value = 1;
  }

  /**
   * Set BPM
   */
  setBpm(bpm: number): void {
    this.bpm = bpm;
    if (this.intervalId !== null) {
      this.start(bpm);
    }
  }

  /**
   * Set subdivision (steps per beat)
   */
  setSubdivision(subdivision: number): void {
    this.subdivision = subdivision;
    if (this.intervalId !== null) {
      this.start(this.bpm);
    }
  }

  connect(destination: Tone.InputNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.output.disconnect();
  }

  dispose(): void {
    this.stop();
    this.input.dispose();
    this.output.dispose();
    this.gateGain.dispose();
  }
}

// Gate presets
export const GATE_PRESETS: Record<string, Partial<GateOptions>> = {
  'Noise Gate': { threshold: -40, smoothing: 0.1 },
  'Tight Gate': { threshold: -30, smoothing: 0.05 },
  'Smooth Gate': { threshold: -35, smoothing: 0.2 },
  'Aggressive': { threshold: -25, smoothing: 0.03 },
};

// Rhythmic gate patterns
export const GATE_PATTERNS: Record<string, number[]> = {
  'Eighth Notes': [1, 0, 1, 0, 1, 0, 1, 0],
  'Sixteenth Notes': [1, 1, 1, 1, 1, 1, 1, 1],
  'Offbeat': [0, 1, 0, 1, 0, 1, 0, 1],
  'Syncopated': [1, 0, 1, 1, 0, 1, 0, 1],
  'Trance 1': [1, 0, 0, 1, 0, 0, 1, 0],
  'Trance 2': [1, 1, 0, 1, 1, 0, 1, 0],
  'Choppy': [1, 0, 0, 0, 1, 0, 0, 0],
  'Glitch': [1, 1, 0, 0, 1, 0, 1, 1],
};
