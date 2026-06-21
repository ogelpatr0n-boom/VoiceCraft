import { useCallback } from 'react';
import type { MidiNote } from '../../audio/midi/midi-event';

interface VelocityLaneProps {
  notes: MidiNote[];
  selectedNoteIds: Set<string>;
  pixelsPerBeat: number;
  scrollX: number;
  width: number;
  height: number;
  clipColor: string;
  onVelocityChange: (noteId: string, velocity: number) => void;
}

export function VelocityLane({
  notes,
  selectedNoteIds,
  pixelsPerBeat,
  scrollX,
  width,
  height,
  clipColor,
  onVelocityChange,
}: VelocityLaneProps) {
  const handleBarDrag = useCallback((
    noteId: string,
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    const bar = e.currentTarget as HTMLElement;
    const lane = bar.parentElement;
    if (!lane) return;

    const startY = e.clientY;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const startVelocity = note.velocity;

    const handleMove = (moveEvent: PointerEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const velocityChange = (deltaY / height) * 127;
      const newVelocity = Math.max(1, Math.min(127, Math.round(startVelocity + velocityChange)));
      onVelocityChange(noteId, newVelocity);
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [notes, height, onVelocityChange]);

  return (
    <div className="velocity-lane" style={{ width, height }}>
      <div className="velocity-lane-bg">
        {/* Horizontal guide lines at 25%, 50%, 75% */}
        <div className="velocity-guide" style={{ bottom: '25%' }} />
        <div className="velocity-guide" style={{ bottom: '50%' }} />
        <div className="velocity-guide" style={{ bottom: '75%' }} />
      </div>

      {notes.map((note) => {
        const x = note.start * pixelsPerBeat - scrollX;
        const barWidth = Math.max(4, note.duration * pixelsPerBeat - 2);
        const barHeight = (note.velocity / 127) * (height - 4);
        const isSelected = selectedNoteIds.has(note.id);

        // Skip if off screen
        if (x + barWidth < 0 || x > width) return null;

        return (
          <div
            key={note.id}
            className={`velocity-bar ${isSelected ? 'selected' : ''}`}
            style={{
              left: x,
              width: barWidth,
              height: barHeight,
              backgroundColor: clipColor,
            }}
            onPointerDown={(e) => handleBarDrag(note.id, e)}
          />
        );
      })}
    </div>
  );
}
