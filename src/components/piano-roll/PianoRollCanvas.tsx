import { useRef, useState, useCallback, useEffect } from 'react';
import type { MidiNote } from '../../audio/midi/midi-event';
import { createMidiNote } from '../../audio/midi/midi-event';
import { GridOverlay } from './GridOverlay';
import type { PianoRollTool } from './NoteTools';

interface PianoRollCanvasProps {
  notes: MidiNote[];
  selectedNoteIds: Set<string>;
  lowNote: number;
  highNote: number;
  noteHeight: number;
  pixelsPerBeat: number;
  totalBeats: number;
  beatsPerBar: number;
  scrollX: number;
  scrollY: number;
  gridDivision: number;
  snapEnabled: boolean;
  tool: PianoRollTool;
  clipColor: string;
  onNoteAdd: (note: MidiNote) => void;
  onNoteRemove: (noteId: string) => void;
  onNoteUpdate: (noteId: string, updates: Partial<MidiNote>) => void;
  onNoteSelect: (noteId: string, addToSelection: boolean) => void;
  onSelectionClear: () => void;
  onScrollChange: (x: number, y: number) => void;
  onPreviewNote: (pitch: number) => void;
  onStopPreview: (pitch: number) => void;
  onSelectionBoxComplete?: (noteIds: string[], addToSelection: boolean) => void;
}

type DragMode = 'none' | 'move' | 'resize-left' | 'resize-right' | 'select-box' | 'draw';

interface DragState {
  mode: DragMode;
  noteId?: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startBeat: number;
  startPitch: number;
  originalNote?: MidiNote;
  // For multi-note moves: originals of all selected notes at drag start
  selectedOriginals?: Map<string, MidiNote>;
  addToSelection?: boolean;
}

export function PianoRollCanvas({
  notes,
  selectedNoteIds,
  lowNote,
  highNote,
  noteHeight,
  pixelsPerBeat,
  totalBeats,
  beatsPerBar,
  scrollX,
  scrollY,
  gridDivision,
  snapEnabled,
  tool,
  clipColor,
  onNoteAdd,
  onNoteRemove,
  onNoteUpdate,
  onNoteSelect,
  onSelectionClear,
  onScrollChange,
  onPreviewNote,
  onStopPreview,
  onSelectionBoxComplete,
}: PianoRollCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const totalNotes = highNote - lowNote + 1;
  const contentHeight = totalNotes * noteHeight;
  const contentWidth = totalBeats * pixelsPerBeat;

  const snapToBeat = useCallback((beat: number): number => {
    if (!snapEnabled) return beat;
    const gridSize = 1 / gridDivision;
    return Math.round(beat / gridSize) * gridSize;
  }, [snapEnabled, gridDivision]);

  const pixelToNote = useCallback((y: number): number => {
    return highNote - Math.floor((y + scrollY) / noteHeight);
  }, [highNote, scrollY, noteHeight]);

  const pixelToBeat = useCallback((x: number): number => {
    return (x + scrollX) / pixelsPerBeat;
  }, [scrollX, pixelsPerBeat]);

  const getNoteAtPosition = useCallback((x: number, y: number): MidiNote | undefined => {
    const beat = pixelToBeat(x);
    const pitch = pixelToNote(y);
    return notes.find(note =>
      note.pitch === pitch && beat >= note.start && beat <= note.start + note.duration
    );
  }, [notes, pixelToBeat, pixelToNote]);

  const getResizeZone = useCallback((x: number, note: MidiNote): 'left' | 'right' | 'middle' => {
    const noteStartX = note.start * pixelsPerBeat - scrollX;
    const noteEndX = (note.start + note.duration) * pixelsPerBeat - scrollX;
    const rz = 8;
    if (x < noteStartX + rz) return 'left';
    if (x > noteEndX - rz) return 'right';
    return 'middle';
  }, [pixelsPerBeat, scrollX]);

  // Compute which notes fall within a selection box (in canvas coords)
  const getNotesInBox = useCallback((x1: number, y1: number, x2: number, y2: number): string[] => {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return notes.filter(note => {
      const noteLeft  = note.start * pixelsPerBeat - scrollX;
      const noteRight = (note.start + note.duration) * pixelsPerBeat - scrollX;
      const noteTop   = (highNote - note.pitch) * noteHeight - scrollY;
      const noteBot   = noteTop + noteHeight;
      return noteRight > minX && noteLeft < maxX && noteBot > minY && noteTop < maxY;
    }).map(n => n.id);
  }, [notes, pixelsPerBeat, scrollX, scrollY, highNote, noteHeight]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const beat = pixelToBeat(x);
    const pitch = pixelToNote(y);

    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (tool === 'draw') {
      const snappedStart = snapToBeat(beat);
      const duration = 1 / gridDivision;
      const newNote = createMidiNote(pitch, snappedStart, duration);
      onNoteAdd(newNote);
      onPreviewNote(pitch);
      setDragState({ mode: 'draw', noteId: newNote.id, startX: x, startY: y, currentX: x, currentY: y, startBeat: snappedStart, startPitch: pitch, originalNote: newNote });

    } else if (tool === 'erase') {
      const noteAtPos = getNoteAtPosition(x, y);
      if (noteAtPos) onNoteRemove(noteAtPos.id);

    } else if (tool === 'select') {
      const noteAtPos = getNoteAtPosition(x, y);

      if (noteAtPos) {
        const zone = getResizeZone(x, noteAtPos);
        if (!selectedNoteIds.has(noteAtPos.id) && !e.shiftKey) onSelectionClear();
        onNoteSelect(noteAtPos.id, e.shiftKey);

        // Snapshot originals for all currently-selected notes (plus this one if newly selected)
        const ids = new Set(selectedNoteIds);
        ids.add(noteAtPos.id);
        const selectedOriginals = new Map<string, MidiNote>();
        for (const note of notes) {
          if (ids.has(note.id)) selectedOriginals.set(note.id, { ...note });
        }

        if (zone === 'left') {
          setDragState({ mode: 'resize-left', noteId: noteAtPos.id, startX: x, startY: y, currentX: x, currentY: y, startBeat: noteAtPos.start, startPitch: noteAtPos.pitch, originalNote: { ...noteAtPos } });
        } else if (zone === 'right') {
          setDragState({ mode: 'resize-right', noteId: noteAtPos.id, startX: x, startY: y, currentX: x, currentY: y, startBeat: noteAtPos.start + noteAtPos.duration, startPitch: noteAtPos.pitch, originalNote: { ...noteAtPos } });
        } else {
          setDragState({ mode: 'move', noteId: noteAtPos.id, startX: x, startY: y, currentX: x, currentY: y, startBeat: noteAtPos.start, startPitch: noteAtPos.pitch, originalNote: { ...noteAtPos }, selectedOriginals });
          onPreviewNote(noteAtPos.pitch);
        }
      } else {
        if (!e.shiftKey) onSelectionClear();
        setDragState({ mode: 'select-box', startX: x, startY: y, currentX: x, currentY: y, startBeat: beat, startPitch: pitch, addToSelection: e.shiftKey });
      }
    }
  }, [tool, pixelToBeat, pixelToNote, snapToBeat, gridDivision, getNoteAtPosition, getResizeZone, selectedNoteIds, notes, onNoteAdd, onNoteRemove, onNoteSelect, onSelectionClear, onPreviewNote]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const beat = pixelToBeat(x);
    const pitch = pixelToNote(y);

    if (!dragState) {
      if (tool === 'select') {
        const noteAtPos = getNoteAtPosition(x, y);
        if (noteAtPos) {
          const zone = getResizeZone(x, noteAtPos);
          containerRef.current!.style.cursor = (zone === 'left' || zone === 'right') ? 'ew-resize' : 'move';
        } else {
          containerRef.current!.style.cursor = 'crosshair';
        }
      }
      return;
    }

    // Always update currentX/currentY for selection box rendering
    setDragState(prev => prev ? { ...prev, currentX: x, currentY: y } : null);

    if (dragState.mode === 'draw' && dragState.noteId) {
      const snappedEnd = snapToBeat(beat);
      const newDuration = Math.max(1 / gridDivision, snappedEnd - dragState.startBeat);
      onNoteUpdate(dragState.noteId, { duration: newDuration });

    } else if (dragState.mode === 'move' && dragState.selectedOriginals) {
      const deltaBeat = beat - pixelToBeat(dragState.startX);
      const deltaPitch = pitch - dragState.startPitch;

      // Move ALL selected notes by the same delta
      for (const [id, orig] of dragState.selectedOriginals) {
        const newStart = snapToBeat(Math.max(0, orig.start + deltaBeat));
        const newPitch = Math.max(lowNote, Math.min(highNote, orig.pitch + deltaPitch));
        onNoteUpdate(id, { start: newStart, pitch: newPitch });
      }

      // Preview pitch for dragged note
      if (dragState.originalNote) {
        const newPitch = Math.max(lowNote, Math.min(highNote, dragState.originalNote.pitch + deltaPitch));
        if (newPitch !== dragState.originalNote.pitch) {
          onStopPreview(dragState.originalNote.pitch);
          onPreviewNote(newPitch);
        }
      }

    } else if (dragState.mode === 'resize-left' && dragState.noteId && dragState.originalNote) {
      const snappedBeat = snapToBeat(beat);
      const maxStart = dragState.originalNote.start + dragState.originalNote.duration - 1 / gridDivision;
      const newStart = Math.max(0, Math.min(maxStart, snappedBeat));
      const newDuration = dragState.originalNote.start + dragState.originalNote.duration - newStart;
      onNoteUpdate(dragState.noteId, { start: newStart, duration: newDuration });

    } else if (dragState.mode === 'resize-right' && dragState.noteId && dragState.originalNote) {
      const snappedBeat = snapToBeat(beat);
      const newDuration = Math.max(1 / gridDivision, snappedBeat - dragState.originalNote.start);
      onNoteUpdate(dragState.noteId, { duration: newDuration });
    }
  }, [dragState, tool, pixelToBeat, pixelToNote, snapToBeat, gridDivision, lowNote, highNote, getNoteAtPosition, getResizeZone, onNoteUpdate, onPreviewNote, onStopPreview]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragState?.mode === 'select-box') {
      const { startX, startY, currentX, currentY, addToSelection } = dragState;
      // Only act if the box was dragged meaningfully
      if (Math.abs(currentX - startX) > 3 || Math.abs(currentY - startY) > 3) {
        const ids = getNotesInBox(startX, startY, currentX, currentY);
        if (onSelectionBoxComplete) {
          onSelectionBoxComplete(ids, addToSelection ?? false);
        } else {
          ids.forEach(id => onNoteSelect(id, true));
        }
      }
    } else if (dragState?.mode === 'move' || dragState?.mode === 'draw') {
      if (dragState.originalNote) onStopPreview(dragState.originalNote.pitch);
    }
    setDragState(null);
  }, [dragState, getNotesInBox, onSelectionBoxComplete, onNoteSelect, onStopPreview]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const deltaX = e.shiftKey ? e.deltaY : e.deltaX;
    const deltaY = e.shiftKey ? 0 : e.deltaY;
    onScrollChange(
      Math.max(0, Math.min(contentWidth - dimensions.width, scrollX + deltaX)),
      Math.max(0, Math.min(contentHeight - dimensions.height, scrollY + deltaY))
    );
  }, [scrollX, scrollY, contentWidth, contentHeight, dimensions, onScrollChange]);

  // Selection box coords in canvas space
  const selBox = dragState?.mode === 'select-box' ? {
    x: Math.min(dragState.startX, dragState.currentX),
    y: Math.min(dragState.startY, dragState.currentY),
    w: Math.abs(dragState.currentX - dragState.startX),
    h: Math.abs(dragState.currentY - dragState.startY),
  } : null;

  return (
    <div
      ref={containerRef}
      className="piano-roll-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      <GridOverlay
        width={dimensions.width}
        height={dimensions.height}
        lowNote={lowNote}
        highNote={highNote}
        noteHeight={noteHeight}
        pixelsPerBeat={pixelsPerBeat}
        beatsPerBar={beatsPerBar}
        totalBeats={totalBeats}
        scrollX={scrollX}
      />

      {/* Notes layer */}
      <div className="notes-layer" style={{ transform: `translate(${-scrollX}px, ${-scrollY}px)` }}>
        {notes.map(note => {
          const x = note.start * pixelsPerBeat;
          const y = (highNote - note.pitch) * noteHeight;
          const isSelected = selectedNoteIds.has(note.id);
          return (
            <div
              key={note.id}
              className={`piano-roll-note ${isSelected ? 'selected' : ''}`}
              style={{
                left: x,
                top: y,
                width: note.duration * pixelsPerBeat - 1,
                height: noteHeight - 1,
                backgroundColor: clipColor,
                opacity: 0.5 + (note.velocity / 127) * 0.5,
              }}
            />
          );
        })}
      </div>

      {/* Selection box */}
      {selBox && selBox.w > 2 && selBox.h > 2 && (
        <div
          className="selection-box"
          style={{ left: selBox.x, top: selBox.y, width: selBox.w, height: selBox.h }}
        />
      )}
    </div>
  );
}
