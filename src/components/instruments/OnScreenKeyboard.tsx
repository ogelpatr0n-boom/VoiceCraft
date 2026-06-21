import { useState, useCallback, useRef, useEffect } from 'react';

interface OnScreenKeyboardProps {
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
  startOctave?: number;
  octaves?: number;
  activeNotes?: Set<number>;
}

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B
const BLACK_KEYS = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function OnScreenKeyboard({
  onNoteOn,
  onNoteOff,
  startOctave = 3,
  octaves = 2,
  activeNotes = new Set(),
}: OnScreenKeyboardProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNoteOn = useCallback((note: number, velocity = 100) => {
    setPressedKeys(prev => new Set(prev).add(note));
    onNoteOn(note, velocity);
  }, [onNoteOn]);

  const handleNoteOff = useCallback((note: number) => {
    setPressedKeys(prev => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
    onNoteOff(note);
  }, [onNoteOff]);

  // Handle mouse/touch events
  const handleKeyDown = useCallback((note: number, e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleNoteOn(note);
  }, [handleNoteOn]);

  const handleKeyUp = useCallback((note: number, e: React.PointerEvent) => {
    e.preventDefault();
    handleNoteOff(note);
  }, [handleNoteOff]);

  // Computer keyboard mapping (QWERTY)
  useEffect(() => {
    const keyMap: Record<string, number> = {
      'a': 0, 'w': 1, 's': 2, 'e': 3, 'd': 4, 'f': 5, 't': 6,
      'g': 7, 'y': 8, 'h': 9, 'u': 10, 'j': 11, 'k': 12, 'o': 13,
      'l': 14, 'p': 15, ';': 16,
    };

    const baseNote = (startOctave + 1) * 12; // C of start octave

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const offset = keyMap[e.key.toLowerCase()];
      if (offset !== undefined) {
        const note = baseNote + offset;
        handleNoteOn(note);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const offset = keyMap[e.key.toLowerCase()];
      if (offset !== undefined) {
        const note = baseNote + offset;
        handleNoteOff(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startOctave, handleNoteOn, handleNoteOff]);

  const renderOctave = (octave: number) => {
    const keys: React.ReactElement[] = [];
    const baseNote = (octave + 1) * 12;

    // White keys
    WHITE_KEYS.forEach((semitone, index) => {
      const note = baseNote + semitone;
      const isPressed = pressedKeys.has(note) || activeNotes.has(note);
      const showLabel = semitone === 0; // Show C note labels

      keys.push(
        <div
          key={`white-${note}`}
          className={`keyboard-key keyboard-key-white ${isPressed ? 'pressed' : ''}`}
          onPointerDown={(e) => handleKeyDown(note, e)}
          onPointerUp={(e) => handleKeyUp(note, e)}
          onPointerLeave={(e) => {
            if (pressedKeys.has(note)) handleKeyUp(note, e);
          }}
          style={{ '--key-index': index } as React.CSSProperties}
        >
          {showLabel && <span className="key-label">C{octave}</span>}
        </div>
      );
    });

    // Black keys
    BLACK_KEYS.forEach((semitone) => {
      const note = baseNote + semitone;
      const isPressed = pressedKeys.has(note) || activeNotes.has(note);

      // Position black keys
      const whiteKeyWidth = 100 / 7; // percentage
      let position = 0;
      if (semitone === 1) position = whiteKeyWidth * 1 - whiteKeyWidth * 0.3;
      else if (semitone === 3) position = whiteKeyWidth * 2 - whiteKeyWidth * 0.3;
      else if (semitone === 6) position = whiteKeyWidth * 4 - whiteKeyWidth * 0.3;
      else if (semitone === 8) position = whiteKeyWidth * 5 - whiteKeyWidth * 0.3;
      else if (semitone === 10) position = whiteKeyWidth * 6 - whiteKeyWidth * 0.3;

      keys.push(
        <div
          key={`black-${note}`}
          className={`keyboard-key keyboard-key-black ${isPressed ? 'pressed' : ''}`}
          onPointerDown={(e) => handleKeyDown(note, e)}
          onPointerUp={(e) => handleKeyUp(note, e)}
          onPointerLeave={(e) => {
            if (pressedKeys.has(note)) handleKeyUp(note, e);
          }}
          style={{ left: `${position}%` }}
        />
      );
    });

    return (
      <div key={`octave-${octave}`} className="keyboard-octave">
        {keys}
      </div>
    );
  };

  const octaveElements = [];
  for (let i = 0; i < octaves; i++) {
    octaveElements.push(renderOctave(startOctave + i));
  }

  return (
    <div className="on-screen-keyboard" ref={containerRef}>
      {octaveElements}
    </div>
  );
}
