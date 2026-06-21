export class LimiterEffect {
  private ctx: AudioContext;
  private compressor: DynamicsCompressorNode;
  private preGain: GainNode;
  private outputGain: GainNode;
  private input: GainNode;
  private output: GainNode;
  private _bypass = false;
  private _ceiling = -0.3;
  private _release = 0.1;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.preGain = ctx.createGain();
    this.outputGain = ctx.createGain();

    // Use a compressor with extreme settings as a limiter
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = this._ceiling;
    this.compressor.knee.value = 0;         // Hard knee for limiting
    this.compressor.ratio.value = 20;       // High ratio for limiting
    this.compressor.attack.value = 0.001;   // Very fast attack
    this.compressor.release.value = this._release;

    this.preGain.gain.value = 1;
    this.outputGain.gain.value = 1;

    this.input.connect(this.preGain);
    this.preGain.connect(this.compressor);
    this.compressor.connect(this.outputGain);
    this.outputGain.connect(this.output);
  }

  get inputNode(): GainNode { return this.input; }
  get outputNode(): GainNode { return this.output; }

  get bypass(): boolean { return this._bypass; }
  set bypass(v: boolean) {
    this._bypass = v;
    if (v) {
      this.preGain.disconnect();
      this.preGain.connect(this.output);
    } else {
      this.preGain.disconnect();
      this.preGain.connect(this.compressor);
    }
  }

  get ceiling(): number { return this._ceiling; }
  setCeiling(value: number): void {
    this._ceiling = Math.max(-30, Math.min(0, value));
    this.compressor.threshold.value = this._ceiling;
  }

  get release(): number { return this._release; }
  setRelease(value: number): void {
    this._release = Math.max(0.01, Math.min(1, value));
    this.compressor.release.value = this._release;
  }

  setInputGain(value: number): void {
    this.preGain.gain.value = Math.max(0, Math.min(4, value));
  }

  setOutputGain(value: number): void {
    this.outputGain.gain.value = Math.max(0, Math.min(2, value));
  }

  getReduction(): number {
    return this.compressor.reduction;
  }
}
