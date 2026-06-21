import { describe, it, expect } from 'vitest';
import {
  midiToFreq,
  freqToMidi,
  midiToNoteName,
  midiToOctave,
  midiToDisplay,
  midiToCents,
  noteNameToPitchClass,
  getScaleNotes,
  snapToScale,
  centsBetween,
  A4_FREQ,
  MIDI_A4,
} from '../src/audio/music-theory';

describe('music-theory', () => {
  describe('midiToFreq', () => {
    it('converts A4 (MIDI 69) to 440 Hz', () => {
      expect(midiToFreq(69)).toBeCloseTo(440, 5);
    });

    it('converts C4 (MIDI 60) to ~261.63 Hz', () => {
      expect(midiToFreq(60)).toBeCloseTo(261.626, 2);
    });

    it('converts A3 (MIDI 57) to 220 Hz', () => {
      expect(midiToFreq(57)).toBeCloseTo(220, 5);
    });

    it('converts A5 (MIDI 81) to 880 Hz', () => {
      expect(midiToFreq(81)).toBeCloseTo(880, 5);
    });
  });

  describe('freqToMidi', () => {
    it('converts 440 Hz to MIDI 69', () => {
      expect(freqToMidi(440)).toBeCloseTo(69, 5);
    });

    it('converts 261.63 Hz to ~MIDI 60', () => {
      expect(freqToMidi(261.626)).toBeCloseTo(60, 1);
    });

    it('is inverse of midiToFreq', () => {
      for (let midi = 36; midi <= 96; midi++) {
        expect(freqToMidi(midiToFreq(midi))).toBeCloseTo(midi, 5);
      }
    });
  });

  describe('midiToNoteName', () => {
    it('returns C for MIDI 60', () => {
      expect(midiToNoteName(60)).toBe('C');
    });

    it('returns A for MIDI 69', () => {
      expect(midiToNoteName(69)).toBe('A');
    });

    it('returns F# for MIDI 66', () => {
      expect(midiToNoteName(66)).toBe('F#');
    });
  });

  describe('midiToOctave', () => {
    it('returns 4 for MIDI 60 (C4)', () => {
      expect(midiToOctave(60)).toBe(4);
    });

    it('returns 4 for MIDI 69 (A4)', () => {
      expect(midiToOctave(69)).toBe(4);
    });

    it('returns 3 for MIDI 48 (C3)', () => {
      expect(midiToOctave(48)).toBe(3);
    });
  });

  describe('midiToDisplay', () => {
    it('displays A4 for MIDI 69', () => {
      expect(midiToDisplay(69)).toBe('A4');
    });

    it('displays C4 for MIDI 60', () => {
      expect(midiToDisplay(60)).toBe('C4');
    });

    it('displays F#3 for MIDI 54', () => {
      expect(midiToDisplay(54)).toBe('F#3');
    });
  });

  describe('midiToCents', () => {
    it('returns 0 for exact MIDI values', () => {
      expect(midiToCents(69)).toBe(0);
    });

    it('returns +/-50 cents for halfway between notes', () => {
      // 69.5 rounds to 70, so cents = (69.5 - 70) * 100 = -50
      expect(midiToCents(69.5)).toBeCloseTo(-50, 5);
    });

    it('returns -50 cents for halfway below', () => {
      expect(midiToCents(68.5)).toBeCloseTo(-50, 5);
    });
  });

  describe('noteNameToPitchClass', () => {
    it('C = 0', () => expect(noteNameToPitchClass('C')).toBe(0));
    it('A = 9', () => expect(noteNameToPitchClass('A')).toBe(9));
    it('B = 11', () => expect(noteNameToPitchClass('B')).toBe(11));
  });

  describe('snapToScale', () => {
    it('snaps to nearest C major note', () => {
      // C# (61) should snap to either C (60) or D (62)
      const snapped = snapToScale(61, 'C', 'major');
      expect([60, 62]).toContain(snapped);
    });

    it('leaves in-scale notes unchanged', () => {
      expect(snapToScale(60, 'C', 'major')).toBe(60); // C
      expect(snapToScale(62, 'C', 'major')).toBe(62); // D
      expect(snapToScale(64, 'C', 'major')).toBe(64); // E
    });

    it('chromatic scale returns nearest semitone', () => {
      expect(snapToScale(60.3, 'C', 'chromatic')).toBe(60);
      expect(snapToScale(60.7, 'C', 'chromatic')).toBe(61);
    });
  });

  describe('getScaleNotes', () => {
    it('C chromatic returns all notes in range', () => {
      const notes = getScaleNotes('C', 'chromatic', 60, 71);
      expect(notes).toHaveLength(12);
    });

    it('C major returns 7 notes per octave', () => {
      const notes = getScaleNotes('C', 'major', 60, 71);
      expect(notes).toHaveLength(7);
      expect(notes).toContain(60); // C
      expect(notes).toContain(62); // D
      expect(notes).toContain(64); // E
      expect(notes).toContain(65); // F
      expect(notes).toContain(67); // G
      expect(notes).toContain(69); // A
      expect(notes).toContain(71); // B
    });

    it('C minor pentatonic returns 5 notes per octave', () => {
      const notes = getScaleNotes('C', 'minor-pentatonic', 60, 71);
      expect(notes).toHaveLength(5);
    });
  });

  describe('centsBetween', () => {
    it('octave is 1200 cents', () => {
      expect(centsBetween(220, 440)).toBeCloseTo(1200, 5);
    });

    it('semitone is 100 cents', () => {
      const f1 = midiToFreq(60);
      const f2 = midiToFreq(61);
      expect(centsBetween(f1, f2)).toBeCloseTo(100, 2);
    });
  });
});
