import * as Tone from 'tone';

export interface TapeSaturationOptions {
  drive: number;          // Input gain/saturation 0-1
  saturation: number;     // Saturation curve intensity 0-1
  bass: number;           // Bass boost/cut in dB
  treble: number;         // Treble cut (tape roll-off) in dB
  noise: number;          // Tape hiss amount 0-1
  wow: number;            // Pitch wobble amount 0-1
  flutter: number;        // Fast pitch variation 0-1
  wet: number;            // Dry/wet mix 0-1
}

const DEFAULT_OPTIONS: TapeSaturationOptions = {
  drive: 0.5,
  saturation: 0.5,
  bass: 2,
  treble: -2,
  noise: 0.1,
  wow: 0,
  flutter: 0,
  wet: 1,
};

/**
 * Tape Saturation Effect
 * Simulates analog tape characteristics including saturation, EQ coloration,
 * tape hiss, wow and flutter
 */
export class TapeSaturationEffect {
  private input: Tone.Gain;
  private output: Tone.Gain;
  private dryGain: Tone.Gain;
  private wetGain: Tone.Gain;
  private inputDrive: Tone.Gain;
  private waveshaper: Tone.Chebyshev;
  private bassEQ: Tone.Filter;
  private trebleEQ: Tone.Filter;
  private noiseSource: Tone.Noise;
  private noiseGain: Tone.Gain;
  private noiseFilter: Tone.Filter;
  private wowLFO: Tone.LFO;
  private flutterLFO: Tone.LFO;
  private pitchShift: Tone.PitchShift;
  private options: TapeSaturationOptions;

  constructor(options: Partial<TapeSaturationOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);
    this.dryGain = new Tone.Gain(1 - this.options.wet);
    this.wetGain = new Tone.Gain(this.options.wet);

    // Input drive stage
    this.inputDrive = new Tone.Gain(1 + this.options.drive * 2);

    // Chebyshev waveshaper for harmonic saturation
    this.waveshaper = new Tone.Chebyshev({
      order: Math.floor(1 + this.options.saturation * 50),
      wet: this.options.saturation,
    });

    // Bass boost (tape head bump)
    this.bassEQ = new Tone.Filter({
      type: 'lowshelf',
      frequency: 100,
      gain: this.options.bass,
    });

    // Treble roll-off (tape high-frequency loss)
    this.trebleEQ = new Tone.Filter({
      type: 'highshelf',
      frequency: 8000,
      gain: this.options.treble,
    });

    // Tape hiss
    this.noiseSource = new Tone.Noise('white');
    this.noiseGain = new Tone.Gain(this.options.noise * 0.05);
    this.noiseFilter = new Tone.Filter({
      type: 'highpass',
      frequency: 1000,
    });

    // Wow (slow pitch wobble)
    this.wowLFO = new Tone.LFO({
      frequency: 0.5,
      min: -5,
      max: 5,
    });

    // Flutter (fast pitch variation)
    this.flutterLFO = new Tone.LFO({
      frequency: 6,
      min: -2,
      max: 2,
    });

    // Pitch shift for wow/flutter
    this.pitchShift = new Tone.PitchShift({
      pitch: 0,
      wet: 1,
    });

    // Connect dry path
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Connect wet path
    this.input.connect(this.inputDrive);
    this.inputDrive.connect(this.waveshaper);
    this.waveshaper.connect(this.bassEQ);
    this.bassEQ.connect(this.trebleEQ);
    this.trebleEQ.connect(this.pitchShift);
    this.pitchShift.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Connect noise
    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.output);

    // Start noise and LFOs
    this.noiseSource.start();
    this.wowLFO.start();
    this.flutterLFO.start();

    this.updateWowFlutter();
  }

  private updateWowFlutter(): void {
    // Combine wow and flutter for pitch modulation
    const totalModulation = this.options.wow + this.options.flutter;
    if (totalModulation > 0) {
      this.wowLFO.min = -this.options.wow * 10;
      this.wowLFO.max = this.options.wow * 10;
      this.flutterLFO.min = -this.options.flutter * 5;
      this.flutterLFO.max = this.options.flutter * 5;
    }
  }

  getInput(): Tone.Gain {
    return this.input;
  }

  getOutput(): Tone.Gain {
    return this.output;
  }

  set drive(value: number) {
    this.options.drive = value;
    this.inputDrive.gain.value = 1 + value * 2;
  }

  set saturation(value: number) {
    this.options.saturation = value;
    this.waveshaper.order = Math.floor(1 + value * 50);
    this.waveshaper.wet.value = value;
  }

  set bass(value: number) {
    this.options.bass = value;
    this.bassEQ.gain.value = value;
  }

  set treble(value: number) {
    this.options.treble = value;
    this.trebleEQ.gain.value = value;
  }

  set noise(value: number) {
    this.options.noise = value;
    this.noiseGain.gain.value = value * 0.05;
  }

  set wow(value: number) {
    this.options.wow = value;
    this.updateWowFlutter();
  }

  set flutter(value: number) {
    this.options.flutter = value;
    this.updateWowFlutter();
  }

  set wet(value: number) {
    this.options.wet = value;
    this.dryGain.gain.value = 1 - value;
    this.wetGain.gain.value = value;
  }

  getOptions(): TapeSaturationOptions {
    return { ...this.options };
  }

  setOptions(options: Partial<TapeSaturationOptions>): void {
    if (options.drive !== undefined) this.drive = options.drive;
    if (options.saturation !== undefined) this.saturation = options.saturation;
    if (options.bass !== undefined) this.bass = options.bass;
    if (options.treble !== undefined) this.treble = options.treble;
    if (options.noise !== undefined) this.noise = options.noise;
    if (options.wow !== undefined) this.wow = options.wow;
    if (options.flutter !== undefined) this.flutter = options.flutter;
    if (options.wet !== undefined) this.wet = options.wet;
  }

  connect(destination: Tone.InputNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.output.disconnect();
  }

  dispose(): void {
    this.noiseSource.stop();
    this.wowLFO.stop();
    this.flutterLFO.stop();

    this.input.dispose();
    this.output.dispose();
    this.dryGain.dispose();
    this.wetGain.dispose();
    this.inputDrive.dispose();
    this.waveshaper.dispose();
    this.bassEQ.dispose();
    this.trebleEQ.dispose();
    this.noiseSource.dispose();
    this.noiseGain.dispose();
    this.noiseFilter.dispose();
    this.wowLFO.dispose();
    this.flutterLFO.dispose();
    this.pitchShift.dispose();
  }
}

// Tape saturation presets
export const TAPE_PRESETS: Record<string, Partial<TapeSaturationOptions>> = {
  'Clean Tape': { drive: 0.2, saturation: 0.2, bass: 1, treble: -1, noise: 0.05, wet: 1 },
  'Warm': { drive: 0.4, saturation: 0.4, bass: 3, treble: -3, noise: 0.1, wet: 1 },
  'Hot': { drive: 0.7, saturation: 0.6, bass: 2, treble: -2, noise: 0.15, wet: 1 },
  'Cassette': { drive: 0.5, saturation: 0.5, bass: 1, treble: -5, noise: 0.2, wow: 0.1, flutter: 0.05, wet: 1 },
  'Reel-to-Reel': { drive: 0.3, saturation: 0.3, bass: 2, treble: -1, noise: 0.05, wow: 0.02, wet: 1 },
  'Degraded': { drive: 0.6, saturation: 0.7, bass: 0, treble: -6, noise: 0.3, wow: 0.15, flutter: 0.1, wet: 1 },
  'Lo-Fi': { drive: 0.5, saturation: 0.5, bass: -2, treble: -4, noise: 0.25, wow: 0.08, flutter: 0.04, wet: 0.7 },
};
