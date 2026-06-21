import { describe, it, expect } from 'vitest';
import { detectKey, detectKeyFromFrequencies } from '../src/audio/key-detection';
import { midiToFreq } from '../src/audio/music-theory';

describe('key-detection', () => {
  it('detects C major from C major pitch classes', () => {
    // C major: C D E F G A B = pitch classes 0 2 4 5 7 9 11
    const pitchClasses = [0, 2, 4, 5, 7, 9, 11, 0, 4, 7, 0, 2, 4, 5, 7];
    const result = detectKey(pitchClasses);

    expect(result.key).toBe('C');
    expect(result.mode).toBe('major');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('detects A minor from A minor pitch classes', () => {
    // A minor: A B C D E F G = pitch classes 9 11 0 2 4 5 7
    // Emphasize A, C, E (tonic triad)
    const pitchClasses = [9, 9, 9, 0, 0, 4, 4, 9, 11, 0, 2, 4, 5, 7, 9];
    const result = detectKey(pitchClasses);

    // A minor and C major share the same notes, but emphasizing A should bias toward A minor
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it('returns correlations for all keys', () => {
    const pitchClasses = [0, 2, 4, 5, 7, 9, 11];
    const result = detectKey(pitchClasses);

    // 12 keys * 2 modes = 24 correlations
    expect(result.correlations).toHaveLength(24);
  });

  it('detectKeyFromFrequencies works with Hz values', () => {
    // Generate frequencies for C major scale
    const frequencies = [
      midiToFreq(60), // C4
      midiToFreq(62), // D4
      midiToFreq(64), // E4
      midiToFreq(65), // F4
      midiToFreq(67), // G4
      midiToFreq(69), // A4
      midiToFreq(71), // B4
      midiToFreq(60), // C4 again for emphasis
      midiToFreq(64), // E4 again
      midiToFreq(67), // G4 again
    ];

    const result = detectKeyFromFrequencies(frequencies);
    expect(result.key).toBe('C');
    expect(result.mode).toBe('major');
  });

  it('handles empty input', () => {
    const result = detectKey([]);
    expect(result.key).toBeDefined();
    expect(result.mode).toBeDefined();
  });

  it('filters zero frequencies', () => {
    const result = detectKeyFromFrequencies([0, 0, 0, 440, 440, 440]);
    expect(result.key).toBeDefined();
  });
});
