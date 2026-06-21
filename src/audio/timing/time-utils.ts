// Time conversion utilities for bars:beats:ticks format

export interface TimeSignature {
  numerator: number;   // beats per bar
  denominator: number; // note value (4 = quarter, 8 = eighth)
}

export interface BarsBeatsTicks {
  bars: number;
  beats: number;
  ticks: number;
}

export const TICKS_PER_BEAT = 480; // Standard MIDI resolution

// Convert seconds to beats at given BPM
export function secondsToBeats(seconds: number, bpm: number): number {
  return (seconds * bpm) / 60;
}

// Convert beats to seconds at given BPM
export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats * 60) / bpm;
}

// Convert beats to bars:beats:ticks
export function beatsToBarsBeatsTicks(
  totalBeats: number,
  timeSignature: TimeSignature
): BarsBeatsTicks {
  const beatsPerBar = timeSignature.numerator;
  const bars = Math.floor(totalBeats / beatsPerBar);
  const remainingBeats = totalBeats - bars * beatsPerBar;
  const beats = Math.floor(remainingBeats);
  const ticks = Math.round((remainingBeats - beats) * TICKS_PER_BEAT);

  return { bars: bars + 1, beats: beats + 1, ticks }; // 1-indexed for display
}

// Convert bars:beats:ticks to total beats
export function barsBeatsTicksToBeats(
  bbt: BarsBeatsTicks,
  timeSignature: TimeSignature
): number {
  const beatsPerBar = timeSignature.numerator;
  return (bbt.bars - 1) * beatsPerBar + (bbt.beats - 1) + bbt.ticks / TICKS_PER_BEAT;
}

// Format time as bars:beats:ticks string
export function formatBarsBeatsTicks(bbt: BarsBeatsTicks): string {
  return `${bbt.bars}:${bbt.beats}:${String(bbt.ticks).padStart(3, '0')}`;
}

// Format time as mm:ss.ms string
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
}

// Quantize a beat position to the nearest grid division
export function quantizeBeats(beats: number, gridDivision: number): number {
  return Math.round(beats * gridDivision) / gridDivision;
}

// Get grid division value (e.g., 4 = quarter notes, 8 = eighth notes, 16 = sixteenth)
export function getGridDivision(gridValue: string): number {
  const divisions: Record<string, number> = {
    '1': 1,      // whole note
    '1/2': 2,    // half note
    '1/4': 4,    // quarter note
    '1/8': 8,    // eighth note
    '1/16': 16,  // sixteenth note
    '1/32': 32,  // thirty-second note
  };
  return divisions[gridValue] ?? 4;
}

// Convert MIDI ticks to beats
export function ticksToBeats(ticks: number): number {
  return ticks / TICKS_PER_BEAT;
}

// Convert beats to MIDI ticks
export function beatsToTicks(beats: number): number {
  return Math.round(beats * TICKS_PER_BEAT);
}

// Get duration of one bar in seconds
export function getBarDuration(bpm: number, timeSignature: TimeSignature): number {
  return beatsToSeconds(timeSignature.numerator, bpm);
}

// Get duration of one beat in seconds
export function getBeatDuration(bpm: number): number {
  return 60 / bpm;
}
