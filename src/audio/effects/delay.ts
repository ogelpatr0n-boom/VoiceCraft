export class DelayEffect {
  private ctx: AudioContext;
  private delayNode: DelayNode;
  private feedbackGain: GainNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private input: GainNode;
  private output: GainNode;
  private _bypass = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.delayNode = ctx.createDelay(5);
    this.feedbackGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    this.delayNode.delayTime.value = 0.3;
    this.feedbackGain.gain.value = 0.3;
    this.wetGain.gain.value = 0.3;
    this.dryGain.gain.value = 1;

    this.input.connect(this.dryGain);
    this.input.connect(this.delayNode);
    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);
    this.delayNode.connect(this.wetGain);
    this.dryGain.connect(this.output);
    this.wetGain.connect(this.output);
  }

  get inputNode(): GainNode { return this.input; }
  get outputNode(): GainNode { return this.output; }

  get bypass(): boolean { return this._bypass; }
  set bypass(v: boolean) {
    this._bypass = v;
    this.wetGain.gain.value = v ? 0 : 0.3;
  }

  setTime(time: number): void {
    this.delayNode.delayTime.value = time;
  }

  setFeedback(value: number): void {
    this.feedbackGain.gain.value = Math.min(value, 0.95);
  }

  setMix(wet: number): void {
    if (this._bypass) return;
    this.wetGain.gain.value = wet;
  }
}
