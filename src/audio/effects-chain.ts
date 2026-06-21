import { CompressorEffect } from './effects/compressor';
import { EQEffect } from './effects/eq';
import { ChorusEffect } from './effects/chorus';
import { DelayEffect } from './effects/delay';
import { ReverbEffect } from './effects/reverb';

export interface EffectNode {
  inputNode: GainNode;
  outputNode: GainNode;
  bypass: boolean;
}

export class EffectsChain {
  private ctx: AudioContext;
  readonly compressor: CompressorEffect;
  readonly eq: EQEffect;
  readonly chorus: ChorusEffect;
  readonly delay: DelayEffect;
  readonly reverb: ReverbEffect;

  private input: GainNode;
  private output: GainNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    this.compressor = new CompressorEffect(ctx);
    this.eq = new EQEffect(ctx);
    this.chorus = new ChorusEffect(ctx);
    this.delay = new DelayEffect(ctx);
    this.reverb = new ReverbEffect(ctx);

    // Wire chain: input -> compressor -> EQ -> chorus -> delay -> reverb -> output
    this.input.connect(this.compressor.inputNode);
    this.compressor.outputNode.connect(this.eq.inputNode);
    this.eq.outputNode.connect(this.chorus.inputNode);
    this.chorus.outputNode.connect(this.delay.inputNode);
    this.delay.outputNode.connect(this.reverb.inputNode);
    this.reverb.outputNode.connect(this.output);
  }

  get inputNode(): GainNode { return this.input; }
  get outputNode(): GainNode { return this.output; }

  bypassAll(bypass: boolean): void {
    this.compressor.bypass = bypass;
    this.eq.bypass = bypass;
    this.chorus.bypass = bypass;
    this.delay.bypass = bypass;
    this.reverb.bypass = bypass;
  }
}
