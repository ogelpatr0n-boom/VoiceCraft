// Real-time pitch detection using autocorrelation (YIN-lite algorithm).
// Works with raw AudioBuffer data from a microphone stream.

export interface PitchResult {
  frequency: number | null;
  note: string | null;
  midi: number | null;
  cents: number;    // deviation from nearest note, -50 to +50
  clarity: number;  // 0–1 confidence
}

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToMidi(freq: number): number {
  return 12 * Math.log2(freq / 440) + 69;
}

export function frequencyToNote(freq: number): { note: string; midi: number; cents: number } {
  const midi = frequencyToMidi(freq);
  const roundedMidi = Math.round(midi);
  const cents = Math.round((midi - roundedMidi) * 100);
  const octave = Math.floor(roundedMidi / 12) - 1;
  const note = NOTE_NAMES[roundedMidi % 12] + octave;
  return { note, midi: roundedMidi, cents };
}

// YIN-like autocorrelation pitch detection
export function detectPitch(buffer: Float32Array, sampleRate: number): PitchResult {
  const SIZE = buffer.length;
  const MIN_FREQ = 50;   // below low E bass
  const MAX_FREQ = 2000; // above high E guitar harmonics we care about
  const MIN_PERIOD = Math.floor(sampleRate / MAX_FREQ);
  const MAX_PERIOD = Math.floor(sampleRate / MIN_FREQ);

  // Compute autocorrelation
  const correlations = new Float32Array(MAX_PERIOD);
  for (let lag = MIN_PERIOD; lag < MAX_PERIOD; lag++) {
    let sum = 0;
    for (let i = 0; i < SIZE - lag; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlations[lag] = sum;
  }

  // Find the first peak above threshold
  let bestLag = -1;
  let bestCorr = -1;
  let prevCorr = correlations[MIN_PERIOD];
  let ascending = false;

  for (let lag = MIN_PERIOD + 1; lag < MAX_PERIOD - 1; lag++) {
    const curr = correlations[lag];
    if (!ascending && curr > prevCorr) ascending = true;
    if (ascending && curr < prevCorr && prevCorr > bestCorr) {
      bestCorr = prevCorr;
      bestLag = lag - 1;
      ascending = false;
    }
    prevCorr = curr;
  }

  // Compute RMS for confidence / silence detection
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);

  if (bestLag === -1 || rms < 0.01) {
    return { frequency: null, note: null, midi: null, cents: 0, clarity: 0 };
  }

  // Parabolic interpolation for sub-sample accuracy
  const alpha = correlations[bestLag - 1];
  const beta  = correlations[bestLag];
  const gamma = correlations[bestLag + 1];
  const denom = alpha - 2 * beta + gamma;
  const refinedLag = denom !== 0 ? bestLag - 0.5 * (alpha - gamma) / denom : bestLag;

  const frequency = sampleRate / refinedLag;
  const clarity = Math.min(1, bestCorr / (rms * rms * (SIZE - bestLag)));
  const { note, midi, cents } = frequencyToNote(frequency);

  return { frequency, note, midi, cents, clarity };
}
