import { useMemo } from 'react';
import type { TimeSignature } from '../../audio/timing/time-utils';

interface TimeRulerProps {
  pixelsPerBeat: number;
  scrollX: number;
  width: number;
  timeSignature: TimeSignature;
  totalBeats: number;
  currentBeat: number;
  loopStart: number;
  loopEnd: number;
  loopEnabled: boolean;
  onPositionClick: (beat: number) => void;
  onLoopChange: (start: number, end: number) => void;
}

export function TimeRuler({
  pixelsPerBeat,
  scrollX,
  width,
  timeSignature,
  totalBeats,
  currentBeat,
  loopStart,
  loopEnd,
  loopEnabled,
  onPositionClick,
  onLoopChange,
}: TimeRulerProps) {
  const beatsPerBar = timeSignature.numerator;

  const markers = useMemo(() => {
    const result = [];
    const startBeat = Math.floor(scrollX / pixelsPerBeat);
    const endBeat = Math.ceil((scrollX + width) / pixelsPerBeat);

    for (let beat = startBeat; beat <= endBeat && beat <= totalBeats; beat++) {
      const isBar = beat % beatsPerBar === 0;
      const x = beat * pixelsPerBeat - scrollX;
      const barNumber = Math.floor(beat / beatsPerBar) + 1;

      result.push({
        beat,
        x,
        isBar,
        label: isBar ? `${barNumber}` : null,
      });
    }
    return result;
  }, [scrollX, width, pixelsPerBeat, beatsPerBar, totalBeats]);

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const beat = (x + scrollX) / pixelsPerBeat;
    onPositionClick(Math.max(0, beat));
  };

  const playheadX = currentBeat * pixelsPerBeat - scrollX;
  const loopStartX = loopStart * pixelsPerBeat - scrollX;
  const loopEndX = loopEnd * pixelsPerBeat - scrollX;
  const loopWidth = loopEndX - loopStartX;

  return (
    <div className="time-ruler" onClick={handleClick}>
      {/* Loop region */}
      {loopEnabled && (
        <div
          className="loop-region"
          style={{
            left: Math.max(0, loopStartX),
            width: Math.min(loopWidth, width - Math.max(0, loopStartX)),
          }}
        />
      )}

      {/* Bar/beat markers */}
      {markers.map(({ beat, x, isBar, label }) => (
        <div
          key={beat}
          className={`ruler-marker ${isBar ? 'bar' : 'beat'}`}
          style={{ left: x }}
        >
          {label && <span className="ruler-label">{label}</span>}
        </div>
      ))}

      {/* Playhead */}
      <div
        className="ruler-playhead"
        style={{ left: playheadX }}
      />
    </div>
  );
}
