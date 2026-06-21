import { EQEffect } from './eq';
import { CompressorEffect } from './compressor';
import { LimiterEffect } from './limiter';

export interface MasterBusParams {
  // EQ
  eqBypass: boolean;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  // Compressor
  compBypass: boolean;
  compThreshold: number;
  compRatio: number;
  compAttack: number;
  compRelease: number;
  compMakeup: number;
  // Limiter
  limiterBypass: boolean;
  limiterCeiling: number;
  limiterRelease: number;
  limiterInputGain: number;
  // Output
  outputGain: number;
}

export const DEFAULT_MASTER_BUS_PARAMS: MasterBusParams = {
  eqBypass: false,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  compBypass: false,
  compThreshold: -18,
  compRatio: 3,
  compAttack: 0.01,
  compRelease: 0.2,
  compMakeup: 1,
  limiterBypass: false,
  limiterCeiling: -0.3,
  limiterRelease: 0.1,
  limiterInputGain: 1,
  outputGain: 1,
};

export class MasterBus {
  private ctx: AudioContext;
  private eq: EQEffect;
  private compressor: CompressorEffect;
  private limiter: LimiterEffect;
  private outputGain: GainNode;
  private analyserLeft: AnalyserNode;
  private analyserRight: AnalyserNode;
  private splitter: ChannelSplitterNode;
  private merger: ChannelMergerNode;
  private input: GainNode;
  private output: GainNode;

  private _params: MasterBusParams;

  constructor(ctx: AudioContext, params: Partial<MasterBusParams> = {}) {
    this.ctx = ctx;
    this._params = { ...DEFAULT_MASTER_BUS_PARAMS, ...params };

    // Create nodes
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.outputGain = ctx.createGain();

    // Effects chain: EQ -> Compressor -> Limiter
    this.eq = new EQEffect(ctx);
    this.compressor = new CompressorEffect(ctx);
    this.limiter = new LimiterEffect(ctx);

    // Analyzers for metering
    this.analyserLeft = ctx.createAnalyser();
    this.analyserRight = ctx.createAnalyser();
    this.analyserLeft.fftSize = 2048;
    this.analyserRight.fftSize = 2048;

    this.splitter = ctx.createChannelSplitter(2);
    this.merger = ctx.createChannelMerger(2);

    // Connect chain
    this.input.connect(this.eq.inputNode);
    this.eq.outputNode.connect(this.compressor.inputNode);
    this.compressor.outputNode.connect(this.limiter.inputNode);
    this.limiter.outputNode.connect(this.outputGain);

    // Split for metering
    this.outputGain.connect(this.splitter);
    this.splitter.connect(this.analyserLeft, 0);
    this.splitter.connect(this.analyserRight, 1);

    // Merge back for output
    this.analyserLeft.connect(this.merger, 0, 0);
    this.analyserRight.connect(this.merger, 0, 1);
    this.merger.connect(this.output);

    // Apply initial params
    this.setParams(this._params);
  }

  get inputNode(): GainNode { return this.input; }
  get outputNode(): GainNode { return this.output; }
  get params(): MasterBusParams { return { ...this._params }; }

  setParams(params: Partial<MasterBusParams>): void {
    this._params = { ...this._params, ...params };

    // EQ
    this.eq.bypass = this._params.eqBypass;
    if (!this._params.eqBypass) {
      this.eq.setLow(this._params.eqLow);
      this.eq.setMid(this._params.eqMid);
      this.eq.setHigh(this._params.eqHigh);
    }

    // Compressor
    this.compressor.bypass = this._params.compBypass;
    if (!this._params.compBypass) {
      this.compressor.setThreshold(this._params.compThreshold);
      this.compressor.setRatio(this._params.compRatio);
      this.compressor.setAttack(this._params.compAttack);
      this.compressor.setRelease(this._params.compRelease);
      this.compressor.setMakeupGain(this._params.compMakeup);
    }

    // Limiter
    this.limiter.bypass = this._params.limiterBypass;
    if (!this._params.limiterBypass) {
      this.limiter.setCeiling(this._params.limiterCeiling);
      this.limiter.setRelease(this._params.limiterRelease);
      this.limiter.setInputGain(this._params.limiterInputGain);
    }

    // Output
    this.outputGain.gain.value = this._params.outputGain;
  }

  // Get peak levels for metering
  getPeakLevels(): { left: number; right: number } {
    const leftData = new Float32Array(this.analyserLeft.fftSize);
    const rightData = new Float32Array(this.analyserRight.fftSize);

    this.analyserLeft.getFloatTimeDomainData(leftData);
    this.analyserRight.getFloatTimeDomainData(rightData);

    let leftPeak = 0;
    let rightPeak = 0;

    for (let i = 0; i < leftData.length; i++) {
      leftPeak = Math.max(leftPeak, Math.abs(leftData[i]));
      rightPeak = Math.max(rightPeak, Math.abs(rightData[i]));
    }

    return { left: leftPeak, right: rightPeak };
  }

  // Get RMS levels for metering
  getRMSLevels(): { left: number; right: number } {
    const leftData = new Float32Array(this.analyserLeft.fftSize);
    const rightData = new Float32Array(this.analyserRight.fftSize);

    this.analyserLeft.getFloatTimeDomainData(leftData);
    this.analyserRight.getFloatTimeDomainData(rightData);

    let leftSum = 0;
    let rightSum = 0;

    for (let i = 0; i < leftData.length; i++) {
      leftSum += leftData[i] * leftData[i];
      rightSum += rightData[i] * rightData[i];
    }

    return {
      left: Math.sqrt(leftSum / leftData.length),
      right: Math.sqrt(rightSum / rightData.length),
    };
  }

  // Get frequency data for spectrum analyzer
  getFrequencyData(): Float32Array {
    const data = new Float32Array(this.analyserLeft.frequencyBinCount);
    this.analyserLeft.getFloatFrequencyData(data);
    return data;
  }

  // Get compression reduction
  getCompressorReduction(): number {
    return this.compressor.getReduction();
  }

  // Get limiter reduction
  getLimiterReduction(): number {
    return this.limiter.getReduction();
  }

  dispose(): void {
    this.input.disconnect();
    this.eq.inputNode.disconnect();
    this.eq.outputNode.disconnect();
    this.compressor.inputNode.disconnect();
    this.compressor.outputNode.disconnect();
    this.limiter.inputNode.disconnect();
    this.limiter.outputNode.disconnect();
    this.outputGain.disconnect();
    this.splitter.disconnect();
    this.analyserLeft.disconnect();
    this.analyserRight.disconnect();
    this.merger.disconnect();
    this.output.disconnect();
  }
}
