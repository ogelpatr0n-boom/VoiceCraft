import { useCallback, useRef, useState } from 'react';

interface FaderProps {
  value: number;
  min?: number;
  max?: number;
  height?: number;
  label?: string;
  onChange: (value: number) => void;
}

export function Fader({ value, min = 0, max = 1, height = 120, label, onChange }: FaderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const normalized = (value - min) / (max - min);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const y = 1 - (e.clientY - rect.top) / rect.height;
      const newValue = min + Math.max(0, Math.min(1, y)) * (max - min);
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    handleMouseMove(e.nativeEvent);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [min, max, onChange]);

  return (
    <div className="fader">
      {label && <span className="knob__label">{label}</span>}
      <div
        ref={trackRef}
        className="fader__track"
        style={{ height }}
        onMouseDown={handleMouseDown}
      >
        <div className="fader__fill" style={{ height: `${normalized * 100}%` }} />
        <div
          className="fader__thumb"
          style={{
            bottom: `${normalized * 100}%`,
            transform: 'translate(-50%, 50%)',
            cursor: dragging ? 'grabbing' : 'grab',
          }}
        />
      </div>
      <span className="knob__value">{value.toFixed(2)}</span>
    </div>
  );
}
