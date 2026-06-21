// All 12 chromatic note names
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type NoteName = typeof NOTE_NAMES[number];

// Scale definitions as semitone intervals from root
export const SCALES: Record<string, number[]> = {
  chromatic: [0,1,2,3,4,5,6,7,8,9,10,11],
  major: [0,2,4,5,7,9,11],
  minor: [0,2,3,5,7,8,10],
  'harmonic-minor': [0,2,3,5,7,8,11],
  'melodic-minor': [0,2,3,5,7,9,11],
  dorian: [0,2,3,5,7,9,10],
  mixolydian: [0,2,4,5,7,9,10],
  pentatonic: [0,2,4,7,9],
  'minor-pentatonic': [0,3,5,7,10],
  blues: [0,3,5,6,7,10],
};

export const A4_FREQ = 440;
export const MIDI_A4 = 69;

// Convert MIDI note number to frequency
export function midiToFreq(midi: number): number {
  return A4_FREQ * Math.pow(2, (midi - MIDI_A4) / 12);
}

// Convert frequency to MIDI note number (fractional)
export function freqToMidi(freq: number): number {
  return MIDI_A4 + 12 * Math.log2(freq / A4_FREQ);
}

// Get the note name from a MIDI number
export function midiToNoteName(midi: number): NoteName {
  return NOTE_NAMES[Math.round(midi) % 12];
}

// Get octave from MIDI number
export function midiToOctave(midi: number): number {
  return Math.floor(Math.round(midi) / 12) - 1;
}

// Get display string like "A4", "C#3"
export function midiToDisplay(midi: number): string {
  return `${midiToNoteName(midi)}${midiToOctave(midi)}`;
}

// Get the cents deviation from the nearest semitone
export function midiToCents(midi: number): number {
  return (midi - Math.round(midi)) * 100;
}

// Convert note name to pitch class (0-11)
export function noteNameToPitchClass(name: NoteName): number {
  return NOTE_NAMES.indexOf(name);
}

// Get scale note MIDIs for a given key and scale spanning a range
export function getScaleNotes(key: NoteName, scaleName: string, midiLow = 24, midiHigh = 96): number[] {
  const scale = SCALES[scaleName] ?? SCALES.chromatic;
  const root = noteNameToPitchClass(key);
  const notes: number[] = [];
  for (let midi = midiLow; midi <= midiHigh; midi++) {
    const pc = midi % 12;
    const interval = (pc - root + 12) % 12;
    if (scale.includes(interval)) {
      notes.push(midi);
    }
  }
  return notes;
}

// Snap a fractional MIDI value to the nearest note in the given scale
export function snapToScale(midi: number, key: NoteName, scaleName: string): number {
  const scale = SCALES[scaleName] ?? SCALES.chromatic;
  const root = noteNameToPitchClass(key);
  let bestDistance = Infinity;
  let bestMidi = Math.round(midi);

  // Check nearby notes (within an octave)
  for (let offset = -12; offset <= 12; offset++) {
    const candidate = Math.round(midi) + offset;
    const pc = ((candidate % 12) + 12) % 12;
    const interval = (pc - root + 12) % 12;
    if (scale.includes(interval)) {
      const dist = Math.abs(midi - candidate);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMidi = candidate;
      }
    }
  }
  return bestMidi;
}

// Cents between two frequencies
export function centsBetween(f1: number, f2: number): number {
  return 1200 * Math.log2(f2 / f1);
}
