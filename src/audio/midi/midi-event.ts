// MIDI event types and data structures

export interface MidiNote {
  id: string;
  pitch: number;      // MIDI note 0-127
  start: number;      // Time in beats
  duration: number;   // Length in beats
  velocity: number;   // 0-127
}

export interface MidiNoteEvent {
  type: 'noteon' | 'noteoff';
  pitch: number;
  velocity: number;
  time: number; // in beats
}

export interface MidiControlChange {
  type: 'cc';
  controller: number; // CC number 0-127
  value: number;      // 0-127
  time: number;       // in beats
}

export interface MidiPitchBend {
  type: 'pitchbend';
  value: number;      // -8192 to 8191
  time: number;       // in beats
}

export type MidiEvent = MidiNoteEvent | MidiControlChange | MidiPitchBend;

// Standard MIDI CC numbers
export const MIDI_CC = {
  MODULATION: 1,
  BREATH: 2,
  VOLUME: 7,
  PAN: 10,
  EXPRESSION: 11,
  SUSTAIN: 64,
  PORTAMENTO: 65,
  SOSTENUTO: 66,
  SOFT_PEDAL: 67,
  ALL_NOTES_OFF: 123,
} as const;

// Create a new MIDI note
export function createMidiNote(
  pitch: number,
  start: number,
  duration: number,
  velocity = 100
): MidiNote {
  return {
    id: crypto.randomUUID(),
    pitch: Math.max(0, Math.min(127, Math.round(pitch))),
    start,
    duration: Math.max(0.0625, duration), // Minimum 1/16 beat
    velocity: Math.max(0, Math.min(127, Math.round(velocity))),
  };
}

// Get note name from MIDI pitch
export function midiPitchToName(pitch: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = noteNames[pitch % 12];
  const octave = Math.floor(pitch / 12) - 1;
  return `${note}${octave}`;
}

// Get MIDI pitch from note name
export function noteNameToMidiPitch(name: string): number {
  const noteMap: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'Fb': 4, 'E#': 5,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11, 'Cb': 11, 'B#': 0,
  };

  const match = name.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) return 60; // Default to middle C

  const noteName = match[1];
  const octave = parseInt(match[2], 10);
  const noteValue = noteMap[noteName] ?? 0;

  return (octave + 1) * 12 + noteValue;
}

// Convert MIDI velocity to normalized 0-1 range
export function velocityToNormalized(velocity: number): number {
  return velocity / 127;
}

// Convert normalized 0-1 to MIDI velocity
export function normalizedToVelocity(normalized: number): number {
  return Math.round(normalized * 127);
}

// Sort notes by start time
export function sortNotesByTime(notes: MidiNote[]): MidiNote[] {
  return [...notes].sort((a, b) => a.start - b.start);
}

// Find notes that overlap with a time range
export function findNotesInRange(
  notes: MidiNote[],
  startBeat: number,
  endBeat: number
): MidiNote[] {
  return notes.filter(note => {
    const noteEnd = note.start + note.duration;
    return note.start < endBeat && noteEnd > startBeat;
  });
}

// Find notes at a specific pitch
export function findNotesAtPitch(notes: MidiNote[], pitch: number): MidiNote[] {
  return notes.filter(note => note.pitch === pitch);
}

// Check if two notes overlap
export function notesOverlap(a: MidiNote, b: MidiNote): boolean {
  if (a.pitch !== b.pitch) return false;
  const aEnd = a.start + a.duration;
  const bEnd = b.start + b.duration;
  return a.start < bEnd && aEnd > b.start;
}
