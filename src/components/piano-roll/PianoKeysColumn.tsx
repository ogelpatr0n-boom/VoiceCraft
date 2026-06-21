import { useMemo } from 'react';
import { midiPitchToName } from '../../audio/midi/midi-event';

interface PianoKeysColumnProps {
  lowNote: number;
  highNote: number;
  noteHeight: number;
  activeNotes?: Set<number>;
  onNoteClick?: (note: number) => void;
}

const BLACK_NOTES = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#

export function PianoKeysColumn({
  lowNote,
  highNote,
  noteHeight,
  activeNotes = new Set(),
  onNoteClick,
}: PianoKeysColumnProps) {
  const keys = useMemo(() => {
    const result = [];
    for (let note = highNote; note >= lowNote; note--) {
      const isBlack = BLACK_NOTES.includes(note % 12);
      const isC = note % 12 === 0;
      result.push({ note, isBlack, isC });
    }
    return result;
  }, [lowNote, highNote]);

  return (
    <div className="piano-keys-column">
      {keys.map(({ note, isBlack, isC }) => {
        const isActive = activeNotes.has(note);
        const name = midiPitchToName(note);

        return (
          <div
            key={note}
            className={`piano-key-row ${isBlack ? 'black' : 'white'} ${isActive ? 'active' : ''} ${isC ? 'is-c' : ''}`}
            style={{ height: noteHeight }}
            onClick={() => onNoteClick?.(note)}
          >
            <span className="piano-key-label">
              {isC ? name : isBlack ? '' : name.replace(/\d+$/, '')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
