import type { MidiNote } from '../midi/midi-event';
import { createMidiNote, sortNotesByTime, findNotesInRange } from '../midi/midi-event';

export interface MidiClipData {
  id: string;
  name: string;
  notes: MidiNote[];
  instrumentId: string | null;
  color: string;
  duration: number; // Total length in beats
}

export interface MidiClipPlacement {
  clipId: string;
  startTime: number; // start time in beats on the timeline
}

export class MidiClip implements MidiClipData {
  id: string;
  name: string;
  notes: MidiNote[];
  instrumentId: string | null;
  color: string;
  duration: number;

  constructor(name = 'MIDI Clip', duration = 4) {
    this.id = crypto.randomUUID();
    this.name = name;
    this.notes = [];
    this.instrumentId = null;
    this.color = '#00d4ff';
    this.duration = duration;
  }

  // Add a note to the clip
  addNote(pitch: number, start: number, duration: number, velocity = 100): MidiNote {
    const note = createMidiNote(pitch, start, duration, velocity);
    this.notes.push(note);
    this.expandToFitNotes();
    return note;
  }

  // Remove a note by ID
  removeNote(noteId: string): boolean {
    const index = this.notes.findIndex(n => n.id === noteId);
    if (index >= 0) {
      this.notes.splice(index, 1);
      return true;
    }
    return false;
  }

  // Update a note
  updateNote(noteId: string, updates: Partial<Omit<MidiNote, 'id'>>): boolean {
    const note = this.notes.find(n => n.id === noteId);
    if (!note) return false;

    if (updates.pitch !== undefined) note.pitch = Math.max(0, Math.min(127, updates.pitch));
    if (updates.start !== undefined) note.start = Math.max(0, updates.start);
    if (updates.duration !== undefined) note.duration = Math.max(0.0625, updates.duration);
    if (updates.velocity !== undefined) note.velocity = Math.max(0, Math.min(127, updates.velocity));

    this.expandToFitNotes();
    return true;
  }

  // Get a note by ID
  getNote(noteId: string): MidiNote | undefined {
    return this.notes.find(n => n.id === noteId);
  }

  // Get all notes sorted by time
  getSortedNotes(): MidiNote[] {
    return sortNotesByTime(this.notes);
  }

  // Get notes in a time range
  getNotesInRange(startBeat: number, endBeat: number): MidiNote[] {
    return findNotesInRange(this.notes, startBeat, endBeat);
  }

  // Expand clip duration to fit all notes
  private expandToFitNotes(): void {
    for (const note of this.notes) {
      const noteEnd = note.start + note.duration;
      if (noteEnd > this.duration) {
        this.duration = Math.ceil(noteEnd);
      }
    }
  }

  // Get the actual end time (last note end)
  getContentDuration(): number {
    let maxEnd = 0;
    for (const note of this.notes) {
      const end = note.start + note.duration;
      if (end > maxEnd) maxEnd = end;
    }
    return maxEnd;
  }

  // Quantize all notes to a grid
  quantize(gridDivision: number): void {
    for (const note of this.notes) {
      note.start = Math.round(note.start * gridDivision) / gridDivision;
      note.duration = Math.max(
        1 / gridDivision,
        Math.round(note.duration * gridDivision) / gridDivision
      );
    }
  }

  // Transpose all notes by semitones
  transpose(semitones: number): void {
    for (const note of this.notes) {
      note.pitch = Math.max(0, Math.min(127, note.pitch + semitones));
    }
  }

  // Shift all notes in time
  shiftTime(beats: number): void {
    for (const note of this.notes) {
      note.start = Math.max(0, note.start + beats);
    }
  }

  // Scale velocities
  scaleVelocity(factor: number): void {
    for (const note of this.notes) {
      note.velocity = Math.max(0, Math.min(127, Math.round(note.velocity * factor)));
    }
  }

  // Clone the clip
  clone(): MidiClip {
    const clip = new MidiClip(`${this.name} (copy)`, this.duration);
    clip.instrumentId = this.instrumentId;
    clip.color = this.color;
    clip.notes = this.notes.map(n => ({ ...n, id: crypto.randomUUID() }));
    return clip;
  }

  // Clear all notes
  clear(): void {
    this.notes = [];
  }

  // Get serializable data
  toData(): MidiClipData {
    return {
      id: this.id,
      name: this.name,
      notes: [...this.notes],
      instrumentId: this.instrumentId,
      color: this.color,
      duration: this.duration,
    };
  }

  // Create from data
  static fromData(data: MidiClipData): MidiClip {
    const clip = new MidiClip(data.name, data.duration);
    clip.id = data.id;
    clip.notes = data.notes.map(n => ({ ...n }));
    clip.instrumentId = data.instrumentId;
    clip.color = data.color;
    return clip;
  }
}

// Create a new MIDI clip
export function createMidiClip(name?: string, duration?: number): MidiClip {
  return new MidiClip(name, duration);
}

// Split a MIDI clip at a specific beat
export function splitMidiClip(clip: MidiClip, splitBeat: number): [MidiClip, MidiClip] {
  const firstHalf = new MidiClip(`${clip.name} (1)`, splitBeat);
  firstHalf.instrumentId = clip.instrumentId;
  firstHalf.color = clip.color;

  const secondHalf = new MidiClip(`${clip.name} (2)`, clip.duration - splitBeat);
  secondHalf.instrumentId = clip.instrumentId;
  secondHalf.color = clip.color;

  for (const note of clip.notes) {
    const noteEnd = note.start + note.duration;

    if (noteEnd <= splitBeat) {
      // Note is entirely in first half
      firstHalf.notes.push({ ...note, id: crypto.randomUUID() });
    } else if (note.start >= splitBeat) {
      // Note is entirely in second half
      secondHalf.notes.push({
        ...note,
        id: crypto.randomUUID(),
        start: note.start - splitBeat,
      });
    } else {
      // Note spans the split - split it
      firstHalf.notes.push({
        ...note,
        id: crypto.randomUUID(),
        duration: splitBeat - note.start,
      });
      secondHalf.notes.push({
        ...note,
        id: crypto.randomUUID(),
        start: 0,
        duration: noteEnd - splitBeat,
      });
    }
  }

  return [firstHalf, secondHalf];
}
