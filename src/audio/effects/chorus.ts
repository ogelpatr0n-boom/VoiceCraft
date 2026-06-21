export class ChorusEffect {
  private ctx: AudioContext;
  private delayL: DelayNode;
  private delayR: DelayNode;
  private lfoL: OscillatorNode;
  private lfoR: OscillatorNode;
  private lfoGainL: GainNode;
  private lfoGainR: GainNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private input: GainNode;
  private output: GainNode;
  private _bypass = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();

    this.wetGain.gain.value = 0.3;
    this.dryGain.gain.value = 0.7;

    // Create stereo delay lines modulated by LFOs
    this.delayL = ctx.createDelay(0.1);
    this.delayR = ctx.createDelay(0.1);
    this.delayL.delayTime.value = 0.015;
    this.delayR.delayTime.value = 0.017;

    this.lfoL = ctx.createOscillator();
    this.lfoR = ctx.createOscillator();
    this.lfoL.frequency.value = 0.7;
    this.lfoR.frequency.value = 0.9;
    this.lfoL.type = 'sine';
    this.lfoR.type = 'sine';

    this.lfoGainL = ctx.createGain();
    this.lfoGainR = ctx.createGain();
    this.lfoGainL.gain.value = 0.002;
    this.lfoGainR.gain.value = 0.002;

    this.lfoL.connect(this.lfoGainL);
    this.lfoR.connect(this.lfoGainR);
    this.lfoGainL.connect(this.delayL.delayTime);
    this.lfoGainR.connect(this.delayR.delayTime);

    this.input.connect(this.dryGain);
    this.input.connect(this.delayL);
    this.input.connect(this.delayR);
    this.delayL.connect(this.wetGain);
    this.delayR.connect(this.wetGain);
    this.dryGain.connect(this.output);
    this.wetGain.connect(this.output);

    this.lfoL.start();
    this.lfoR.start();
  }

  get inputNode(): GainNode { return this.input; }
  get outputNode(): GainNode { return this.output; }

  get bypass(): boolean { return this._bypass; }
  set bypass(v: boolean) {
    this._bypass = v;
    this.wetGain.gain.value = v ? 0 : 0.3;
    this.dryGain.gain.value = v ? 1 : 0.7;
  }

  setRate(rate: number): void {
    this.lfoL.frequency.value = rate;
    this.lfoR.frequency.value = rate * 1.3;
  }

  setDepth(depth: number): void {
    this.lfoGainL.gain.value = depth * 0.005;
    this.lfoGainR.gain.value = depth * 0.005;
  }

  setMix(wet: number): void {
    if (this._bypass) return;
    this.wetGain.gain.value = wet;
    this.dryGain.gain.value = 1 - wet;
  }
}
