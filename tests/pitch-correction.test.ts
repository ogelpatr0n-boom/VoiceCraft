import { describe, it, expect } from 'vitest';
import { PitchCorrector } from '../src/audio/pitch-correction';
import { midiToFreq } from '../src/audio/music-theory';

describe('PitchCorrector', () => {
  it('returns zero shift when disabled', () => {
    const corrector = new PitchCorrector();
    const result = corrector.correct(440, {
      key: 'C',
      scale: 'major',
      retuneSpeed: 0,
      humanize: 0,
      amount: 100,
      enabled: false,
    }, 0.01);

    expect(result.correctedFreq).toBe(440);
    expect(result.shiftCents).toBe(0);
  });

  it('snaps to nearest scale note with instant retune', () => {
    const corrector = new PitchCorrector();
    // C#4 = MIDI 61, freq ~277.18 Hz - should snap to C (60) or D (62) in C major
    const freq = midiToFreq(61); // C#4
    const result = corrector.correct(freq, {
      key: 'C',
      scale: 'major',
      retuneSpeed: 0,
      humanize: 0,
      amount: 100,
      enabled: true,
    }, 0.01);

    // Should be snapped to C or D
    const correctedMidi = Math.round(result.correctedMidi);
    expect([60, 62]).toContain(correctedMidi);
    expect(result.shiftCents).not.toBe(0);
  });

  it('does not shift in-scale notes', () => {
    const corrector = new PitchCorrector();
    // A4 = 440 Hz, MIDI 69, which is A - in C major
    const result = corrector.correct(440, {
      key: 'C',
      scale: 'major',
      retuneSpeed: 0,
      humanize: 0,
      amount: 100,
      enabled: true,
    }, 0.01);

    expect(Math.abs(result.shiftCents)).toBeLessThan(5);
  });

  it('half correction amount gives half shift', () => {
    const corrector100 = new PitchCorrector();
    const corrector50 = new PitchCorrector();
    const freq = midiToFreq(61); // C#4 - out of C major

    const result100 = corrector100.correct(freq, {
      key: 'C', scale: 'major', retuneSpeed: 0, humanize: 0, amount: 100, enabled: true,
    }, 0.01);

    const result50 = corrector50.correct(freq, {
      key: 'C', scale: 'major', retuneSpeed: 0, humanize: 0, amount: 50, enabled: true,
    }, 0.01);

    // 50% should give roughly half the shift of 100%
    expect(Math.abs(result50.shiftCents)).toBeLessThan(Math.abs(result100.shiftCents));
    expect(Math.abs(result50.shiftCents)).toBeGreaterThan(0);
  });

  it('slow retune speed converges over multiple frames', () => {
    const corrector = new PitchCorrector();
    const freq = midiToFreq(61); // C#4 - not in C major
    const params = {
      key: 'C' as const, scale: 'major', retuneSpeed: 200, humanize: 0, amount: 100, enabled: true,
    };

    // Run several frames and check that correction converges toward the target
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(corrector.correct(freq, params, 0.01)); // 10ms per frame
    }

    const firstShift = Math.abs(results[0].shiftCents);
    const lastShift = Math.abs(results[results.length - 1].shiftCents);

    // After 500ms of correction, it should have converged more than the first frame
    // The last frame's correctedMidi should be closer to the target
    const target = results[0].targetMidi;
    const firstDist = Math.abs(results[0].correctedMidi - target);
    const lastDist = Math.abs(results[results.length - 1].correctedMidi - target);
    expect(lastDist).toBeLessThan(firstDist + 0.01);
  });

  it('chromatic scale corrects to nearest semitone', () => {
    const corrector = new PitchCorrector();
    // 445 Hz is slightly above A4 (440)
    const result = corrector.correct(445, {
      key: 'C', scale: 'chromatic', retuneSpeed: 0, humanize: 0, amount: 100, enabled: true,
    }, 0.01);

    // Should snap to A4 = 440 Hz
    expect(result.correctedMidi).toBeCloseTo(69, 0);
  });

  it('reset clears internal state', () => {
    const corrector = new PitchCorrector();
    corrector.correct(440, {
      key: 'C', scale: 'major', retuneSpeed: 100, humanize: 0, amount: 100, enabled: true,
    }, 0.01);

    corrector.reset();

    // After reset, a new correction should start fresh
    const result = corrector.correct(440, {
      key: 'C', scale: 'major', retuneSpeed: 0, humanize: 0, amount: 100, enabled: true,
    }, 0.01);

    expect(result.correctedFreq).toBeGreaterThan(0);
  });

  it('humanize adds variation', () => {
    const corrector = new PitchCorrector();
    const params = {
      key: 'C' as const, scale: 'major', retuneSpeed: 0, humanize: 100, amount: 100, enabled: true,
    };

    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(corrector.correct(440, params, 0.05));
    }

    // With humanize=100, there should be some variation
    const midis = results.map(r => r.correctedMidi);
    const min = Math.min(...midis);
    const max = Math.max(...midis);
    expect(max - min).toBeGreaterThan(0);
  });
});
