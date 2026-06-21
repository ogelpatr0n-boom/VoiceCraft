// Per-instrument Tone.js FX chain engine.
// Each instrument gets its own Channel + EQ3 + Compressor + Reverb + FeedbackDelay.
// Call connectInstrument() after creating a Tone instrument so audio flows through the chain.
import * as Tone from 'tone';

export interface TrackFxParams {
  eqLow: number;         // dB -12..+12
  eqMid: number;
  eqHigh: number;
  reverbWet: number;     // 0..1
  reverbDecay: number;   // seconds
  delayWet: number;      // 0..1
  delayTime: number;     // seconds
  delayFeedback: number; // 0..0.95
  compThreshold: number; // dB
  compRatio: number;
  compEnabled: boolean;
}

export const DEFAULT_FX: TrackFxParams = {
  eqLow: 0, eqMid: 0, eqHigh: 0,
  reverbWet: 0, reverbDecay: 2,
  delayWet: 0, delayTime: 0.25, delayFeedback: 0.3,
  compThreshold: -24, compRatio: 4, compEnabled: false,
};

interface TrackFxInstance {
  channel: Tone.Channel;
  eq: Tone.EQ3;
  comp: Tone.Compressor;
  reverb: Tone.Reverb;
  delay: Tone.FeedbackDelay;
}

class TrackFxEngine {
  private instances = new Map<string, TrackFxInstance>();

  private create(id: string): TrackFxInstance {
    const eq = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
    const comp = new Tone.Compressor({ threshold: -24, ratio: 4, attack: 0.003, release: 0.25 });
    const reverb = new Tone.Reverb({ decay: 2, wet: 0 });
    const delay = new Tone.FeedbackDelay({ delayTime: 0.25, feedback: 0.3, wet: 0 });
    const channel = new Tone.Channel({ volume: 0, pan: 0 });
    // Route: channel → eq → comp → reverb → delay → destination
    channel.chain(eq, comp, reverb, delay, Tone.getDestination());
    const inst = { channel, eq, comp, reverb, delay };
    this.instances.set(id, inst);
    return inst;
  }

  getOrCreate(id: string): TrackFxInstance {
    return this.instances.get(id) ?? this.create(id);
  }

  /** Connect a Tone.js node so its output flows through this track's FX chain */
  connectInstrument(instrumentId: string, node: Tone.ToneAudioNode): void {
    const inst = this.getOrCreate(instrumentId);
    // Disconnect from default destination first if already connected
    try { node.disconnect(); } catch { /* not connected */ }
    node.connect(inst.channel);
  }

  remove(instrumentId: string): void {
    const inst = this.instances.get(instrumentId);
    if (!inst) return;
    inst.delay.dispose();
    inst.reverb.dispose();
    inst.comp.dispose();
    inst.eq.dispose();
    inst.channel.dispose();
    this.instances.delete(instrumentId);
  }

  applyParams(instrumentId: string, p: TrackFxParams, volumeDb = 0, pan = 0, muted = false): void {
    const inst = this.getOrCreate(instrumentId);
    inst.eq.low.value = p.eqLow;
    inst.eq.mid.value = p.eqMid;
    inst.eq.high.value = p.eqHigh;
    inst.reverb.wet.value = p.reverbWet;
    inst.reverb.decay = Math.max(0.1, p.reverbDecay);
    inst.delay.wet.value = p.delayWet;
    inst.delay.delayTime.value = p.delayTime;
    inst.delay.feedback.value = p.delayFeedback;
    inst.comp.threshold.value = p.compThreshold;
    inst.comp.ratio.value = p.compRatio;
    // Bypass compressor by setting ratio to 1 when disabled
    if (!p.compEnabled) inst.comp.ratio.value = 1;
    inst.channel.volume.value = volumeDb;
    inst.channel.pan.value = pan;
    inst.channel.mute = muted;
  }
}

export const trackFxEngine = new TrackFxEngine();
