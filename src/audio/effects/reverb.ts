export class ReverbEffect {
  private ctx: AudioContext;
  private convolver: ConvolverNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private input: GainNode;
  private output: GainNode;
  private _bypass = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.convolver = ctx.createConvolver();
    this.wetGain = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    this.wetGain.gain.value = 0.3;
    this.dryGain.gain.value = 0.7;

    this.input.connect(this.dryGain);
    this.input.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.dryGain.connect(this.output);
    this.wetGain.connect(this.output);

    this.generateImpulse(2, 2);
  }

  private generateImpulse(duration: number, decay: number): void {
    const length = this.ctx.sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    this.convolver.buffer = impulse;
  }

  get inputNode(): GainNode { return this.input; }
  get outputNode(): GainNode { return this.output; }

  get bypass(): boolean { return this._bypass; }
  set bypass(v: boolean) {
    this._bypass = v;
    if (v) {
      this.wetGain.gain.value = 0;
      this.dryGain.gain.value = 1;
    }
  }

  setMix(wet: number): void {
    if (this._bypass) return;
    this.wetGain.gain.value = wet;
    this.dryGain.gain.value = 1 - wet;
  }

  setDecay(duration: number, decay: number): void {
    this.generateImpulse(duration, decay);
  }
}
