export class EQEffect {
  private ctx: AudioContext;
  private lowShelf: BiquadFilterNode;
  private midPeak: BiquadFilterNode;
  private highShelf: BiquadFilterNode;
  private input: GainNode;
  private output: GainNode;
  private _bypass = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    this.lowShelf = ctx.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 320;
    this.lowShelf.gain.value = 0;

    this.midPeak = ctx.createBiquadFilter();
    this.midPeak.type = 'peaking';
    this.midPeak.frequency.value = 1000;
    this.midPeak.Q.value = 1;
    this.midPeak.gain.value = 0;

    this.highShelf = ctx.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 3200;
    this.highShelf.gain.value = 0;

    this.input.connect(this.lowShelf);
    this.lowShelf.connect(this.midPeak);
    this.midPeak.connect(this.highShelf);
    this.highShelf.connect(this.output);
  }

  get inputNode(): GainNode { return this.input; }
  get outputNode(): GainNode { return this.output; }

  get bypass(): boolean { return this._bypass; }
  set bypass(v: boolean) {
    this._bypass = v;
    if (v) {
      this.lowShelf.gain.value = 0;
      this.midPeak.gain.value = 0;
      this.highShelf.gain.value = 0;
    }
  }

  setLow(gain: number): void {
    if (!this._bypass) this.lowShelf.gain.value = gain;
  }

  setMid(gain: number): void {
    if (!this._bypass) this.midPeak.gain.value = gain;
  }

  setHigh(gain: number): void {
    if (!this._bypass) this.highShelf.gain.value = gain;
  }
}
