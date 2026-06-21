import { useState, useCallback } from 'react';
import type { DrumPadInfo } from '../../audio/instruments/drum-machine';
import { DRUM_PADS } from '../../audio/instruments/drum-machine';

interface DrumPadsProps {
  onPadHit: (padIndex: number, velocity: number) => void;
  activePads?: Set<number>;
}

export function DrumPads({ onPadHit, activePads = new Set() }: DrumPadsProps) {
  const [pressedPads, setPressedPads] = useState<Set<number>>(new Set());

  const handlePadDown = useCallback((index: number, e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setPressedPads(prev => new Set(prev).add(index));
    onPadHit(index, 100);
  }, [onPadHit]);

  const handlePadUp = useCallback((index: number) => {
    setPressedPads(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  // Arrange pads in 4x4 grid (bottom-left to top-right)
  const rows: DrumPadInfo[][] = [];
  for (let row = 3; row >= 0; row--) {
    rows.push(DRUM_PADS.slice(row * 4, row * 4 + 4) as unknown as DrumPadInfo[]);
  }

  return (
    <div className="drum-pads">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="drum-pads-row">
          {row.map((pad, colIndex) => {
            const padIndex = (3 - rowIndex) * 4 + colIndex;
            const isPressed = pressedPads.has(padIndex);
            const isActive = activePads.has(padIndex);

            return (
              <div
                key={pad.note}
                className={`drum-pad ${isPressed ? 'pressed' : ''} ${isActive ? 'active' : ''}`}
                onPointerDown={(e) => handlePadDown(padIndex, e)}
                onPointerUp={() => handlePadUp(padIndex)}
                onPointerLeave={() => handlePadUp(padIndex)}
              >
                <span className="drum-pad-name">{pad.shortName}</span>
                <span className="drum-pad-full-name">{pad.name}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
