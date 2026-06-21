import * as Tone from 'tone';

export interface SidechainCompressorOptions {
  threshold: number;      // dB, when to start compressing
  ratio: number;          // Compression ratio
  attack: number;         // Attack time in seconds
  release: number;        // Release time in seconds
  knee: number;           // Soft knee in dB
  makeupGain: number;     // Output gain in dB
}

const DEFAULT_OPTIONS: SidechainCompressorOptions = {
  threshold: -24,
  ratio: 8,
  attack: 0.003,
  release: 0.25,
  knee: 6,
  makeupGain: 0,
};

/**
 * Sidechain Compressor Effect
 * Creates the classic "pumping" effect used in EDM, house, and modern pop.
 * Can be triggered by an external audio signal or via manual triggers.
 */
export class SidechainCompressor {
  private compressor: DynamicsCompressorNode;
  private inputGain: GainNode;
  private outputGain: GainNode;
  private envelopeFollower: GainNode;
  private sidechainInput: GainNode;
  private options: SidechainCompressorOptions;
  private context: AudioContext;
  private triggerEnvelope: GainNode;
  private isConnected: boolean = false;

  // For beat-synced triggering
  private triggerInterval: number | null = null;
  private bpm: number = 120;
  private triggerPattern: number[] = [1, 0, 0, 0]; // Quarter note default

  constructor(context?: AudioContext, options: Partial<SidechainCompressorOptions> = {}) {
    this.context = context || (Tone.getContext().rawContext as AudioContext);
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Create nodes
    this.inputGain = this.context.createGain();
    this.outputGain = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.envelopeFollower = this.context.createGain();
    this.sidechainInput = this.context.createGain();
    this.triggerEnvelope = this.context.createGain();

    // Configure compressor
    this.compressor.threshold.value = this.options.threshold;
    this.compressor.ratio.value = this.options.ratio;
    this.compressor.attack.value = this.options.attack;
    this.compressor.release.value = this.options.release;
    this.compressor.knee.value = this.options.knee;

    // Output gain for makeup
    this.outputGain.gain.value = Math.pow(10, this.options.makeupGain / 20);

    // Connect main signal path
    this.inputGain.connect(this.compressor);
    this.compressor.connect(this.outputGain);

    // Envelope follower for manual triggering
    this.triggerEnvelope.gain.value = 0;
  }

  get input(): GainNode {
    return this.inputGain;
  }

  get output(): GainNode {
    return this.outputGain;
  }

  get sidechain(): GainNode {
    return this.sidechainInput;
  }

  /**
   * Connect an external audio source as the sidechain trigger
   * (e.g., a kick drum track)
   */
  connectSidechain(source: AudioNode): void {
    source.connect(this.sidechainInput);
    this.isConnected = true;
  }

  /**
   * Disconnect the sidechain input
   */
  disconnectSidechain(): void {
    this.sidechainInput.disconnect();
    this.isConnected = false;
  }

  /**
   * Manually trigger the sidechain effect
   * This creates the ducking envelope programmatically
   */
  trigger(time?: number): void {
    const t = time ?? this.context.currentTime;
    const attack = this.options.attack;
    const release = this.options.release;

    // Duck the signal
    this.inputGain.gain.cancelScheduledValues(t);
    this.inputGain.gain.setValueAtTime(1, t);
    this.inputGain.gain.linearRampToValueAtTime(0.1, t + attack);
    this.inputGain.gain.exponentialRampToValueAtTime(1, t + attack + release);
  }

  /**
   * Start beat-synced triggering
   */
  startBeatSync(bpm: number, pattern: number[] = [1, 0, 0, 0]): void {
    this.stopBeatSync();
    this.bpm = bpm;
    this.triggerPattern = pattern;

    const beatDuration = 60 / bpm / 4; // 16th note resolution
    let step = 0;

    this.triggerInterval = window.setInterval(() => {
      const patternStep = step % this.triggerPattern.length;
      if (this.triggerPattern[patternStep] === 1) {
        this.trigger();
      }
      step++;
    }, beatDuration * 1000);
  }

  /**
   * Stop beat-synced triggering
   */
  stopBeatSync(): void {
    if (this.triggerInterval !== null) {
      clearInterval(this.triggerInterval);
      this.triggerInterval = null;
    }
  }

  /**
   * Set the trigger pattern (array of 0s and 1s)
   */
  setPattern(pattern: number[]): void {
    this.triggerPattern = pattern;
  }

  /**
   * Update BPM for beat sync
   */
  setBpm(bpm: number): void {
    this.bpm = bpm;
    if (this.triggerInterval !== null) {
      this.startBeatSync(bpm, this.triggerPattern);
    }
  }

  // Getters and setters for parameters
  get threshold(): number {
    return this.compressor.threshold.value;
  }
  set threshold(value: number) {
    this.compressor.threshold.value = value;
    this.options.threshold = value;
  }

  get ratio(): number {
    return this.compressor.ratio.value;
  }
  set ratio(value: number) {
    this.compressor.ratio.value = value;
    this.options.ratio = value;
  }

  get attack(): number {
    return this.compressor.attack.value;
  }
  set attack(value: number) {
    this.compressor.attack.value = value;
    this.options.attack = value;
  }

  get release(): number {
    return this.compressor.release.value;
  }
  set release(value: number) {
    this.compressor.release.value = value;
    this.options.release = value;
  }

  get makeupGain(): number {
    return this.options.makeupGain;
  }
  set makeupGain(value: number) {
    this.options.makeupGain = value;
    this.outputGain.gain.value = Math.pow(10, value / 20);
  }

  /**
   * Get current gain reduction in dB
   */
  getReduction(): number {
    return this.compressor.reduction;
  }

  /**
   * Connect to a destination
   */
  connect(destination: AudioNode): void {
    this.outputGain.connect(destination);
  }

  /**
   * Disconnect from all destinations
   */
  disconnect(): void {
    this.outputGain.disconnect();
  }

  /**
   * Get all current settings
   */
  getOptions(): SidechainCompressorOptions {
    return { ...this.options };
  }

  /**
   * Update multiple settings at once
   */
  setOptions(options: Partial<SidechainCompressorOptions>): void {
    if (options.threshold !== undefined) this.threshold = options.threshold;
    if (options.ratio !== undefined) this.ratio = options.ratio;
    if (options.attack !== undefined) this.attack = options.attack;
    if (options.release !== undefined) this.release = options.release;
    if (options.knee !== undefined) this.compressor.knee.value = options.knee;
    if (options.makeupGain !== undefined) this.makeupGain = options.makeupGain;
  }

  /**
   * Dispose of all audio nodes
   */
  dispose(): void {
    this.stopBeatSync();
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    this.compressor.disconnect();
    this.envelopeFollower.disconnect();
    this.sidechainInput.disconnect();
    this.triggerEnvelope.disconnect();
  }
}

// Preset patterns for common genres
export const SIDECHAIN_PATTERNS = {
  fourOnFloor: [1, 0, 0, 0],           // Every beat
  halfTime: [1, 0, 0, 0, 0, 0, 0, 0],  // Every other beat
  offbeat: [0, 0, 1, 0],               // Offbeat pump
  eighth: [1, 0, 1, 0],                // Eighth notes
  sixteenth: [1, 1, 1, 1],             // Constant pumping
  trap: [1, 0, 0, 0, 0, 0, 1, 0],      // Trap style
};
