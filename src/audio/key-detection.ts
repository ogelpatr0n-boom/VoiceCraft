import { NOTE_NAMES, type NoteName } from './music-theory';

// Krumhansl-Schmuckler key profiles
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

export interface KeyDetectionResult {
  key: NoteName;
  mode: 'major' | 'minor';
  confidence: number;
  correlations: Array<{ key: NoteName; mode: 'major' | 'minor'; correlation: number }>;
}

function correlate(histogram: number[], profile: number[]): number {
  const n = histogram.length;
  let sumH = 0, sumP = 0;
  for (let i = 0; i < n; i++) { sumH += histogram[i]; sumP += profile[i]; }
  const meanH = sumH / n;
  const meanP = sumP / n;

  let num = 0, denH = 0, denP = 0;
  for (let i = 0; i < n; i++) {
    const dh = histogram[i] - meanH;
    const dp = profile[i] - meanP;
    num += dh * dp;
    denH += dh * dh;
    denP += dp * dp;
  }

  const denom = Math.sqrt(denH * denP);
  return denom === 0 ? 0 : num / denom;
}

export function detectKey(pitchClasses: number[]): KeyDetectionResult {
  // Build pitch class histogram
  const histogram = new Array(12).fill(0);
  for (const pc of pitchClasses) {
    histogram[Math.round(pc) % 12]++;
  }

  // Normalize
  const max = Math.max(...histogram);
  if (max > 0) {
    for (let i = 0; i < 12; i++) histogram[i] /= max;
  }

  const correlations: Array<{ key: NoteName; mode: 'major' | 'minor'; correlation: number }> = [];

  // Test all keys and modes
  for (let root = 0; root < 12; root++) {
    // Rotate histogram to align with root
    const rotated = new Array(12);
    for (let i = 0; i < 12; i++) {
      rotated[i] = histogram[(i + root) % 12];
    }

    const majorCorr = correlate(rotated, MAJOR_PROFILE);
    const minorCorr = correlate(rotated, MINOR_PROFILE);

    correlations.push({ key: NOTE_NAMES[root], mode: 'major', correlation: majorCorr });
    correlations.push({ key: NOTE_NAMES[root], mode: 'minor', correlation: minorCorr });
  }

  // Sort by correlation
  correlations.sort((a, b) => b.correlation - a.correlation);

  const best = correlations[0];
  return {
    key: best.key,
    mode: best.mode,
    confidence: best.correlation,
    correlations,
  };
}

export function detectKeyFromFrequencies(frequencies: number[]): KeyDetectionResult {
  const pitchClasses = frequencies
    .filter(f => f > 0)
    .map(f => Math.round(12 * Math.log2(f / 440) + 69) % 12);
  return detectKey(pitchClasses);
}
