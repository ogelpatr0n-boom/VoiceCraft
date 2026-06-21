export class CompressorEffect {
  private ctx: AudioContext;
  private compressor: DynamicsCompressorNode;
  private makeupGain: GainNode;
  private input: GainNode;
  private output: GainNode;
  private _bypass = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.compressor = ctx.createDynamicsCompressor();
    this.makeupGain = ctx.createGain();
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.makeupGain.gain.value = 1;

    this.input.connect(this.compressor);
    this.compressor.connect(this.makeupGain);
    this.makeupGain.connect(this.output);
  }

  get inputNode(): GainNode { return this.input; }
  get outputNode(): GainNode { return this.output; }

  get bypass(): boolean { return this._bypass; }
  set bypass(v: boolean) {
    this._bypass = v;
    if (v) {
      this.input.disconnect();
      this.input.connect(this.output);
    } else {
      this.input.disconnect();
      this.input.connect(this.compressor);
    }
  }

  setThreshold(value: number): void { this.compressor.threshold.value = value; }
  setKnee(value: number): void { this.compressor.knee.value = value; }
  setRatio(value: number): void { this.compressor.ratio.value = value; }
  setAttack(value: number): void { this.compressor.attack.value = value; }
  setRelease(value: number): void { this.compressor.release.value = value; }
  setMakeupGain(value: number): void { this.makeupGain.gain.value = value; }

  getReduction(): number { return this.compressor.reduction; }
}
