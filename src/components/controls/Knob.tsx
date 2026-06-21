import { useCallback, useRef, useState } from 'react';

export interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  color?: string;
  size?: number;
  logarithmic?: boolean;
  bipolar?: boolean;
}

export function Knob({ label, value, min, max, step = 1, unit = '', onChange, color = 'var(--accent-cyan)', size = 56, logarithmic = false, bipolar = false }: KnobProps) {
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartValue = useRef(0);

  const normalizedValue = (value - min) / (max - min);
  const displayValue = step < 1 ? value.toFixed(2) : Math.round(value);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStartY.current = e.clientY;
    dragStartValue.current = value;

    const handleMouseMove = (e: MouseEvent) => {
      const dy = dragStartY.current - e.clientY;
      const range = max - min;
      const sensitivity = e.shiftKey ? 0.001 : 0.005;
      let newValue = dragStartValue.current + dy * range * sensitivity;

      // Snap to step
      newValue = Math.round(newValue / step) * step;
      newValue = Math.max(min, Math.min(max, newValue));
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [value, min, max, step, onChange]);

  const rotation = normalizedValue * 270 - 135;

  return (
    <div className="knob">
      <div
        className="knob__dial"
        style={{
          width: size,
          height: size,
          '--knob-value': normalizedValue,
          background: `conic-gradient(from -135deg, ${color} ${normalizedValue * 270}deg, var(--bg-tertiary) ${normalizedValue * 270}deg 270deg, transparent 270deg)`,
          cursor: dragging ? 'grabbing' : 'grab',
        } as React.CSSProperties}
        onMouseDown={handleMouseDown}
      >
        <div
          className="knob__indicator"
          style={{
            transform: `translateX(-50%) rotate(${rotation}deg)`,
            background: color,
          }}
        />
      </div>
      <span className="knob__value">{displayValue}{unit}</span>
      <span className="knob__label">{label}</span>
    </div>
  );
}
