import { PitchCorrector, type PitchCorrectionParams } from './pitch-correction';
import { detectPitchYIN } from './pitch-detection';
import { freqToMidi } from './music-theory';

export interface ProcessingProgress {
  percent: number;
  currentTime: number;
  totalTime: number;
}

export async function processAudioOffline(
  inputBuffer: AudioBuffer,
  params: PitchCorrectionParams,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<{ outputBuffer: AudioBuffer; pitchData: Array<{ time: number; freq: number; correctedMidi: number; targetMidi: number }> }> {
  const sampleRate = inputBuffer.sampleRate;
  const inputData = inputBuffer.getChannelData(0);
  const outputData = new Float32Array(inputData.length);
  const pitchData: Array<{ time: number; freq: number; correctedMidi: number; targetMidi: number }> = [];

  const corrector = new PitchCorrector();
  const windowSize = 1024;
  const hopSize = 512;
  const totalHops = Math.floor((inputData.length - windowSize) / hopSize);

  // Process in chunks
  for (let hop = 0; hop < totalHops; hop++) {
    const start = hop * hopSize;
    const window = inputData.subarray(start, start + windowSize);

    // Detect pitch
    const { frequency, clarity } = detectPitchYIN(window, sampleRate);

    const time = start / sampleRate;
    const dt = hopSize / sampleRate;

    if (frequency > 0 && clarity > 0.85) {
      const result = corrector.correct(frequency, params, dt);

      pitchData.push({
        time,
        freq: frequency,
        correctedMidi: result.correctedMidi,
        targetMidi: result.targetMidi,
      });

      // Apply pitch shift to this hop
      const shiftRatio = result.correctedFreq / frequency;
      for (let i = 0; i < hopSize; i++) {
        const srcIdx = start + Math.floor(i * shiftRatio);
        if (srcIdx < inputData.length) {
          outputData[start + i] = inputData[srcIdx];
        }
      }
    } else {
      // No pitch detected, copy through
      for (let i = 0; i < hopSize; i++) {
        outputData[start + i] = inputData[start + i];
      }
      pitchData.push({ time, freq: 0, correctedMidi: 0, targetMidi: 0 });
    }

    // Report progress periodically
    if (hop % 100 === 0) {
      onProgress?.({
        percent: (hop / totalHops) * 100,
        currentTime: time,
        totalTime: inputData.length / sampleRate,
      });
      // Yield to main thread
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // Create output AudioBuffer
  const offlineCtx = new OfflineAudioContext(1, outputData.length, sampleRate);
  const outputBuffer = offlineCtx.createBuffer(1, outputData.length, sampleRate);
  outputBuffer.getChannelData(0).set(outputData);

  onProgress?.({ percent: 100, currentTime: inputData.length / sampleRate, totalTime: inputData.length / sampleRate });

  return { outputBuffer, pitchData };
}
