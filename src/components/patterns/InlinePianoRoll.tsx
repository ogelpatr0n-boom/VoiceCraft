import { useState, useCallback, useRef, useEffect } from 'react';
import { usePatternStore, type MelodicPattern } from '../../stores/pattern-store';
import { createMidiNote, midiPitchToName } from '../../audio/midi/midi-event';
import type { MidiNote } from '../../audio/midi/midi-event';
import { Playhead } from './Playhead';

interface InlinePianoRollProps {
  patternId: string;
  pattern: MelodicPattern;
  isLooping: boolean;
  onNotePreview?: (pitch: number) => void;
}

const NOTE_HEIGHT = 8;
const STEP_WIDTH = 20;
const KEYS_WIDTH = 40;
const LOW_NOTE = 36;  // C2
const HIGH_NOTE = 84; // C6
const TOTAL_NOTES = HIGH_NOTE - LOW_NOTE + 1;

export function InlinePianoRoll({
  patternId,
  pattern,
  isLooping,
  onNotePreview,
}: InlinePianoRollProps) {
  const { addNote, updateNote, removeNote } = usePatternStore();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const beatsPerBar = 4;
  const stepsPerBeat = 4;
  const totalSteps = pattern.bars * beatsPerBar * stepsPerBeat;
  const gridWidth = totalSteps * STEP_WIDTH;
  const gridHeight = TOTAL_NOTES * NOTE_HEIGHT;

  const pitchToY = (pitch: number) => (HIGH_NOTE - pitch) * NOTE_HEIGHT;
  const yToPitch = (y: number) => HIGH_NOTE - Math.floor(y / NOTE_HEIGHT);
  const beatToX = (beat: number) => beat * stepsPerBeat * STEP_WIDTH;
  const xToBeat = (x: number) => x / (stepsPerBeat * STEP_WIDTH);

  const handleGridClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left - KEYS_WIDTH;
    const y = e.clientY - rect.top;

    if (x < 0) return;

    const pitch = yToPitch(y);
    const beat = Math.floor(xToBeat(x) * 4) / 4; // Quantize to 16th notes

    // Check if clicking on existing note
    const clickedNote = pattern.notes.find(note => {
      const noteX = beatToX(note.start);
      const noteWidth = beatToX(note.duration);
      const noteY = pitchToY(note.pitch);
      return (
        x >= noteX &&
        x <= noteX + noteWidth &&
        y >= noteY &&
        y <= noteY + NOTE_HEIGHT
      );
    });

    if (clickedNote) {
      if (e.shiftKey) {
        // Delete note
        removeNote(patternId, clickedNote.id);
        setSelectedNoteId(null);
      } else {
        // Select note
        setSelectedNoteId(clickedNote.id);
      }
    } else {
      // Create new note
      if (pitch >= LOW_NOTE && pitch <= HIGH_NOTE) {
        const newNote = createMidiNote(pitch, beat, 0.25, 100);
        addNote(patternId, newNote);
        onNotePreview?.(pitch);
        setSelectedNoteId(newNote.id);
      }
    }
  }, [pattern, patternId, addNote, removeNote, isDragging, onNotePreview]);

  const handleKeyClick = useCallback((pitch: number) => {
    onNotePreview?.(pitch);
  }, [onNotePreview]);

  const handleClear = useCallback(() => {
    pattern.notes.forEach(note => removeNote(patternId, note.id));
    setSelectedNoteId(null);
  }, [pattern, patternId, removeNote]);

  const isBlackKey = (pitch: number) => {
    const note = pitch % 12;
    return [1, 3, 6, 8, 10].includes(note);
  };

  return (
    <div className="inline-piano-roll">
      <div className="piano-roll-controls">
        <button className="btn btn--sm" onClick={handleClear}>
          Clear
        </button>
        <span className="note-count">{pattern.notes.length} notes</span>
        <span className="help-text">Click to add, Shift+click to delete</span>
      </div>

      <div
        className="piano-roll-container"
        ref={containerRef}
        style={{ height: gridHeight + 2 }}
      >
        {/* Piano keys column */}
        <div className="piano-keys-mini" style={{ width: KEYS_WIDTH }}>
          {Array.from({ length: TOTAL_NOTES }, (_, i) => {
            const pitch = HIGH_NOTE - i;
            const isC = pitch % 12 === 0;
            return (
              <div
                key={pitch}
                className={`piano-key-mini ${isBlackKey(pitch) ? 'black' : 'white'} ${isC ? 'is-c' : ''}`}
                style={{ height: NOTE_HEIGHT }}
                onClick={() => handleKeyClick(pitch)}
              >
                {isC && <span className="key-label-mini">{midiPitchToName(pitch)}</span>}
              </div>
            );
          })}
        </div>

        {/* Grid area */}
        <div
          className="piano-roll-grid"
          style={{ width: gridWidth }}
          onClick={handleGridClick}
        >
          {/* Grid lines */}
          <svg className="grid-lines" width={gridWidth} height={gridHeight}>
            {/* Horizontal lines (notes) */}
            {Array.from({ length: TOTAL_NOTES }, (_, i) => {
              const pitch = HIGH_NOTE - i;
              const y = i * NOTE_HEIGHT;
              return (
                <rect
                  key={`row-${i}`}
                  x={0}
                  y={y}
                  width={gridWidth}
                  height={NOTE_HEIGHT}
                  className={`grid-row ${isBlackKey(pitch) ? 'black-key' : 'white-key'} ${pitch % 12 === 0 ? 'is-c' : ''}`}
                />
              );
            })}

            {/* Vertical lines (beats) */}
            {Array.from({ length: totalSteps + 1 }, (_, i) => (
              <line
                key={`vline-${i}`}
                x1={i * STEP_WIDTH}
                y1={0}
                x2={i * STEP_WIDTH}
                y2={gridHeight}
                className={`grid-line ${i % (stepsPerBeat * beatsPerBar) === 0 ? 'bar' : i % stepsPerBeat === 0 ? 'beat' : 'subdivision'}`}
              />
            ))}
          </svg>

          {/* Notes */}
          <div className="notes-container">
            {pattern.notes.map(note => {
              const x = beatToX(note.start);
              const y = pitchToY(note.pitch);
              const width = Math.max(STEP_WIDTH / 2, beatToX(note.duration));

              return (
                <div
                  key={note.id}
                  className={`piano-roll-note ${selectedNoteId === note.id ? 'selected' : ''}`}
                  style={{
                    left: x,
                    top: y,
                    width,
                    height: NOTE_HEIGHT - 1,
                    backgroundColor: `hsl(${(note.pitch * 3) % 360}, 70%, 50%)`,
                    opacity: note.velocity / 127,
                  }}
                  title={`${midiPitchToName(note.pitch)} | ${note.start.toFixed(2)} beats`}
                />
              );
            })}
          </div>

          {/* Playhead */}
          <Playhead
            totalSteps={totalSteps}
            stepWidth={STEP_WIDTH}
            height={gridHeight}
            isPlaying={isLooping}
          />
        </div>
      </div>
    </div>
  );
}
