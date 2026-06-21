import { freqToMidi, midiToFreq, snapToScale, type NoteName } from './music-theory';

export interface PitchCorrectionParams {
  key: NoteName;
  scale: string;
  retuneSpeed: number;     // 0-400ms, 0 = instant/hard tune
  humanize: number;         // 0-100, adds micro-variation
  amount: number;           // 0-100, correction strength
  enabled: boolean;
}

// Simple seeded noise for humanization
function perlinish(t: number): number {
  return Math.sin(t * 2.1) * 0.3 + Math.sin(t * 5.7) * 0.2 + Math.sin(t * 13.3) * 0.1;
}

export class PitchCorrector {
  private currentMidi = 0;
  private targetMidi = 0;
  private smoothedMidi = 0;
  private time = 0;

  correct(
    detectedFreq: number,
    params: PitchCorrectionParams,
    deltaTime: number
  ): { correctedFreq: number; correctedMidi: number; targetMidi: number; shiftCents: number } {
    if (!params.enabled || detectedFreq <= 0) {
      return { correctedFreq: detectedFreq, correctedMidi: 0, targetMidi: 0, shiftCents: 0 };
    }

    this.currentMidi = freqToMidi(detectedFreq);
    this.targetMidi = snapToScale(this.currentMidi, params.key, params.scale);

    // Amount controls how far toward the target we correct
    const amount = params.amount / 100;
    const fullTarget = this.currentMidi + (this.targetMidi - this.currentMidi) * amount;

    // Retune speed: first-order lowpass filter
    // retuneSpeed=0 means instant, retuneSpeed=400 means very slow
    if (params.retuneSpeed <= 0) {
      this.smoothedMidi = fullTarget;
    } else {
      const tau = params.retuneSpeed / 1000; // convert ms to seconds
      const alpha = 1 - Math.exp(-deltaTime / tau);
      this.smoothedMidi += (fullTarget - this.smoothedMidi) * alpha;
    }

    // Humanize: add micro-pitch variation
    this.time += deltaTime;
    let finalMidi = this.smoothedMidi;
    if (params.humanize > 0) {
      const jitter = perlinish(this.time * 6) * (params.humanize / 100) * 0.15; // max ~15 cents
      finalMidi += jitter;
    }

    const correctedFreq = midiToFreq(finalMidi);
    const shiftCents = (finalMidi - this.currentMidi) * 100;

    return {
      correctedFreq,
      correctedMidi: finalMidi,
      targetMidi: this.targetMidi,
      shiftCents,
    };
  }

  reset(): void {
    this.currentMidi = 0;
    this.targetMidi = 0;
    this.smoothedMidi = 0;
    this.time = 0;
  }
}
