// YIN pitch detection algorithm (main-thread version for offline processing)
export interface PitchResult {
  frequency: number;
  clarity: number;
  midi: number;
  timestamp: number;
}

export function detectPitchYIN(
  buffer: Float32Array,
  sampleRate: number,
  threshold = 0.15
): { frequency: number; clarity: number } {
  const halfLen = Math.floor(buffer.length / 2);
  const yinBuffer = new Float32Array(halfLen);

  // Step 1: Difference function
  for (let tau = 0; tau < halfLen; tau++) {
    let sum = 0;
    for (let i = 0; i < halfLen; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfLen; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }

  // Step 3: Absolute threshold
  let tauEstimate = -1;
  for (let tau = 2; tau < halfLen; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < halfLen && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) {
    return { frequency: 0, clarity: 0 };
  }

  // Step 4: Parabolic interpolation
  const s0 = tauEstimate > 0 ? yinBuffer[tauEstimate - 1] : yinBuffer[tauEstimate];
  const s1 = yinBuffer[tauEstimate];
  const s2 = tauEstimate + 1 < halfLen ? yinBuffer[tauEstimate + 1] : yinBuffer[tauEstimate];

  let betterTau = tauEstimate;
  const denom = 2 * s1 - s2 - s0;
  if (denom !== 0) {
    betterTau = tauEstimate + (s2 - s0) / (2 * denom);
  }

  const frequency = sampleRate / betterTau;
  const clarity = 1 - s1;

  return { frequency, clarity };
}
