import { useState, useCallback, useRef, useEffect } from 'react';

interface BPMControlProps {
  value: number;
  onChange: (bpm: number) => void;
  min?: number;
  max?: number;
}

export function BPMControl({
  value,
  onChange,
  min = 20,
  max = 300,
}: BPMControlProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value));
    }
  }, [value, isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(String(value));
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const newValue = parseInt(editValue, 10);
    if (!isNaN(newValue)) {
      onChange(Math.max(min, Math.min(max, newValue)));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(String(value));
    }
  };

  const handleIncrement = (delta: number) => {
    onChange(Math.max(min, Math.min(max, value + delta)));
  };

  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    const recentTaps = tapTimes.filter((t) => now - t < 3000); // Keep last 3 seconds

    if (recentTaps.length >= 1) {
      const intervals = [];
      for (let i = 1; i < recentTaps.length; i++) {
        intervals.push(recentTaps[i] - recentTaps[i - 1]);
      }
      intervals.push(now - recentTaps[recentTaps.length - 1]);

      if (intervals.length >= 2) {
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const bpm = Math.round(60000 / avgInterval);
        onChange(Math.max(min, Math.min(max, bpm)));
      }
    }

    setTapTimes([...recentTaps, now].slice(-8)); // Keep last 8 taps
  }, [tapTimes, onChange, min, max]);

  return (
    <div className="bpm-control">
      <button
        className="bpm-btn decrement"
        onClick={() => handleIncrement(-1)}
        onDoubleClick={() => handleIncrement(-10)}
      >
        -
      </button>

      <div className="bpm-display" onDoubleClick={handleDoubleClick}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="number"
            className="bpm-input"
            value={editValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            min={min}
            max={max}
          />
        ) : (
          <>
            <span className="bpm-value">{value}</span>
            <span className="bpm-label">BPM</span>
          </>
        )}
      </div>

      <button
        className="bpm-btn increment"
        onClick={() => handleIncrement(1)}
        onDoubleClick={() => handleIncrement(10)}
      >
        +
      </button>

      <button
        className="tap-tempo-btn"
        onClick={handleTapTempo}
        title="Tap Tempo"
      >
        TAP
      </button>
    </div>
  );
}
