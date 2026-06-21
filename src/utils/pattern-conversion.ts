import type { DrumPattern, MelodicPattern, Pattern } from '../stores/pattern-store';
import { isDrumPattern, isMelodicPattern } from '../stores/pattern-store';
import type { TimelineClip } from '../stores/timeline-store';
import type { MidiNote } from '../audio/midi/midi-event';
import { createMidiNote } from '../audio/midi/midi-event';

// MIDI note numbers for drum sounds (General MIDI drum map approximation)
const DRUM_PAD_MIDI_NOTES = [
  36, // Kick
  38, // Snare
  37, // Rim
  39, // Clap
  42, // Closed HH
  46, // Open HH
  41, // Low Tom
  45, // Mid Tom
  48, // High Tom
  49, // Crash
  51, // Ride
  56, // Cowbell
  75, // Clave
  54, // Tambourine
  70, // Maracas
  69, // Cabasa
];

/**
 * Convert a drum pattern to MIDI notes
 */
export function drumPatternToMidiNotes(pattern: DrumPattern): MidiNote[] {
  const notes: MidiNote[] = [];
  const stepsPerBeat = 4; // 16th notes
  const beatsPerBar = 4;
  const totalBeats = pattern.bars * beatsPerBar;

  for (let padIndex = 0; padIndex < pattern.grid.length; padIndex++) {
    const row = pattern.grid[padIndex];
    const midiNote = DRUM_PAD_MIDI_NOTES[padIndex] || (36 + padIndex);

    for (let step = 0; step < row.length; step++) {
      if (row[step]) {
        const startBeat = step / stepsPerBeat;
        notes.push(createMidiNote(
          midiNote,
          startBeat,
          0.25, // 16th note duration
          100   // velocity
        ));
      }
    }
  }

  return notes;
}

/**
 * Convert a pattern to a timeline clip
 */
export function patternToClip(
  pattern: Pattern,
  trackId: string,
  startBeat: number = 0,
  color?: string
): Omit<TimelineClip, 'id'> {
  const beatsPerBar = 4;
  const duration = pattern.bars * beatsPerBar;

  if (isDrumPattern(pattern)) {
    return {
      trackId,
      type: 'midi',
      name: pattern.name,
      startBeat,
      duration,
      color: color || '#00d4ff',
      notes: drumPatternToMidiNotes(pattern),
      instrumentId: pattern.instrumentId,
    };
  }

  if (isMelodicPattern(pattern)) {
    return {
      trackId,
      type: 'midi',
      name: pattern.name,
      startBeat,
      duration,
      color: color || '#4ecdc4',
      notes: pattern.notes.map(note => ({ ...note })),
      instrumentId: pattern.instrumentId,
    };
  }

  // Fallback
  return {
    trackId,
    type: 'midi',
    name: 'Unknown Pattern',
    startBeat,
    duration: beatsPerBar,
    color: color || '#888888',
    notes: [],
  };
}

/**
 * Convert a timeline clip to a drum pattern
 */
export function clipToDrumPattern(
  clip: TimelineClip,
  instrumentId: string
): DrumPattern | null {
  if (clip.type !== 'midi' || !clip.notes) return null;

  const beatsPerBar = 4;
  const stepsPerBeat = 4;
  const bars = Math.ceil(clip.duration / beatsPerBar);
  const steps = bars * stepsPerBeat * beatsPerBar;

  // Initialize empty grid
  const grid: boolean[][] = Array(16).fill(null).map(() => Array(steps).fill(false));

  // Populate grid from notes
  for (const note of clip.notes) {
    const padIndex = DRUM_PAD_MIDI_NOTES.indexOf(note.pitch);
    if (padIndex >= 0 && padIndex < 16) {
      const step = Math.round(note.start * stepsPerBeat);
      if (step >= 0 && step < steps) {
        grid[padIndex][step] = true;
      }
    }
  }

  return {
    id: crypto.randomUUID(),
    name: clip.name,
    instrumentId,
    steps,
    bars,
    grid,
    isLooping: false,
  };
}

/**
 * Convert a timeline clip to a melodic pattern
 */
export function clipToMelodicPattern(
  clip: TimelineClip,
  instrumentId: string
): MelodicPattern | null {
  if (clip.type !== 'midi' || !clip.notes) return null;

  const beatsPerBar = 4;
  const bars = Math.ceil(clip.duration / beatsPerBar);

  return {
    id: crypto.randomUUID(),
    name: clip.name,
    instrumentId,
    bars,
    notes: clip.notes.map(note => ({
      ...note,
      id: crypto.randomUUID(),
    })),
    isLooping: false,
  };
}

/**
 * Calculate the duration in beats for a pattern
 */
export function getPatternDuration(pattern: Pattern): number {
  const beatsPerBar = 4;
  return pattern.bars * beatsPerBar;
}

/**
 * Get a summary of a pattern's content
 */
export function getPatternSummary(pattern: Pattern): string {
  if (isDrumPattern(pattern)) {
    const activeSteps = pattern.grid.reduce(
      (sum, row) => sum + row.filter(Boolean).length,
      0
    );
    return `${pattern.bars} bar${pattern.bars > 1 ? 's' : ''}, ${activeSteps} hits`;
  }

  if (isMelodicPattern(pattern)) {
    const noteCount = pattern.notes.length;
    return `${pattern.bars} bar${pattern.bars > 1 ? 's' : ''}, ${noteCount} note${noteCount !== 1 ? 's' : ''}`;
  }

  return '';
}

/**
 * Quantize melodic pattern notes to a grid
 */
export function quantizePattern(
  pattern: MelodicPattern,
  gridSize: number = 0.25 // 16th notes by default
): MelodicPattern {
  const quantizedNotes = pattern.notes.map(note => ({
    ...note,
    start: Math.round(note.start / gridSize) * gridSize,
    duration: Math.max(gridSize, Math.round(note.duration / gridSize) * gridSize),
  }));

  return {
    ...pattern,
    notes: quantizedNotes,
  };
}

/**
 * Transpose a melodic pattern by semitones
 */
export function transposePattern(
  pattern: MelodicPattern,
  semitones: number
): MelodicPattern {
  const transposedNotes = pattern.notes.map(note => ({
    ...note,
    pitch: Math.max(0, Math.min(127, note.pitch + semitones)),
  }));

  return {
    ...pattern,
    notes: transposedNotes,
  };
}

/**
 * Shift a pattern in time
 */
export function shiftPattern(
  pattern: MelodicPattern,
  beats: number
): MelodicPattern {
  const beatsPerBar = 4;
  const patternDuration = pattern.bars * beatsPerBar;

  const shiftedNotes = pattern.notes.map(note => {
    let newStart = note.start + beats;
    // Wrap around
    while (newStart < 0) newStart += patternDuration;
    while (newStart >= patternDuration) newStart -= patternDuration;
    return { ...note, start: newStart };
  });

  return {
    ...pattern,
    notes: shiftedNotes,
  };
}

/**
 * Reverse a drum pattern
 */
export function reverseDrumPattern(pattern: DrumPattern): DrumPattern {
  const reversedGrid = pattern.grid.map(row => [...row].reverse());

  return {
    ...pattern,
    grid: reversedGrid,
  };
}

/**
 * Double the length of a pattern
 */
export function doublePattern(pattern: Pattern): Pattern {
  if (isDrumPattern(pattern)) {
    const newSteps = pattern.steps * 2;
    const newGrid = pattern.grid.map(row => [...row, ...row]);

    return {
      ...pattern,
      bars: pattern.bars * 2,
      steps: newSteps,
      grid: newGrid,
    };
  }

  if (isMelodicPattern(pattern)) {
    const beatsPerBar = 4;
    const originalDuration = pattern.bars * beatsPerBar;
    const doubledNotes = [
      ...pattern.notes,
      ...pattern.notes.map(note => ({
        ...note,
        id: crypto.randomUUID(),
        start: note.start + originalDuration,
      })),
    ];

    return {
      ...pattern,
      bars: pattern.bars * 2,
      notes: doubledNotes,
    };
  }

  return pattern;
}
