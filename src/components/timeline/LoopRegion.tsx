import { useCallback, useState } from 'react';

interface LoopRegionProps {
  startX: number;
  endX: number;
  height: number;
  enabled: boolean;
  onLoopChange: (startBeat: number, endBeat: number) => void;
  pixelsPerBeat: number;
  scrollX: number;
}

export function LoopRegion({
  startX,
  endX,
  height,
  enabled,
  onLoopChange,
  pixelsPerBeat,
  scrollX,
}: LoopRegionProps) {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'move' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [originalStart, setOriginalStart] = useState(0);
  const [originalEnd, setOriginalEnd] = useState(0);

  const width = endX - startX;

  const handlePointerDown = useCallback((
    e: React.PointerEvent,
    type: 'start' | 'end' | 'move'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(type);
    setDragStartX(e.clientX);
    setOriginalStart((startX + scrollX) / pixelsPerBeat);
    setOriginalEnd((endX + scrollX) / pixelsPerBeat);
  }, [startX, endX, scrollX, pixelsPerBeat]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX;
    const deltaBeat = deltaX / pixelsPerBeat;

    if (isDragging === 'start') {
      const newStart = Math.max(0, Math.min(originalEnd - 1, originalStart + deltaBeat));
      onLoopChange(newStart, originalEnd);
    } else if (isDragging === 'end') {
      const newEnd = Math.max(originalStart + 1, originalEnd + deltaBeat);
      onLoopChange(originalStart, newEnd);
    } else if (isDragging === 'move') {
      const duration = originalEnd - originalStart;
      const newStart = Math.max(0, originalStart + deltaBeat);
      onLoopChange(newStart, newStart + duration);
    }
  }, [isDragging, dragStartX, originalStart, originalEnd, pixelsPerBeat, onLoopChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  if (!enabled) return null;

  return (
    <div
      className="loop-region-overlay"
      style={{
        left: startX,
        width,
        height,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div
        className="loop-handle left"
        onPointerDown={(e) => handlePointerDown(e, 'start')}
      />
      <div
        className="loop-body"
        onPointerDown={(e) => handlePointerDown(e, 'move')}
      />
      <div
        className="loop-handle right"
        onPointerDown={(e) => handlePointerDown(e, 'end')}
      />
    </div>
  );
}
