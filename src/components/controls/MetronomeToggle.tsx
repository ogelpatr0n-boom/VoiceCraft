import { useState } from 'react';
import { Knob } from './Knob';

interface MetronomeToggleProps {
  enabled: boolean;
  volume: number; // dB
  onToggle: (enabled: boolean) => void;
  onVolumeChange: (volume: number) => void;
}

export function MetronomeToggle({
  enabled,
  volume,
  onToggle,
  onVolumeChange,
}: MetronomeToggleProps) {
  const [showVolume, setShowVolume] = useState(false);

  return (
    <div
      className="metronome-control"
      onMouseEnter={() => setShowVolume(true)}
      onMouseLeave={() => setShowVolume(false)}
    >
      <button
        className={`metronome-btn ${enabled ? 'active' : ''}`}
        onClick={() => onToggle(!enabled)}
        title="Metronome"
      >
        <MetronomeIcon />
      </button>

      {showVolume && (
        <div className="metronome-volume-popup">
          <Knob
            value={volume}
            min={-40}
            max={0}
            onChange={onVolumeChange}
            label="Vol"
            size={36}
            unit="dB"
          />
        </div>
      )}
    </div>
  );
}

function MetronomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C11.45 2 11 2.45 11 3V4.07C7.38 4.53 4.53 7.38 4.07 11H3C2.45 11 2 11.45 2 12S2.45 13 3 13H4.07C4.53 16.62 7.38 19.47 11 19.93V21C11 21.55 11.45 22 12 22S13 21.55 13 21V19.93C16.62 19.47 19.47 16.62 19.93 13H21C21.55 13 22 12.55 22 12S21.55 11 21 11H19.93C19.47 7.38 16.62 4.53 13 4.07V3C13 2.45 12.55 2 12 2M12 6C15.31 6 18 8.69 18 12S15.31 18 12 18 6 15.31 6 12 8.69 6 12 6M12 8C9.79 8 8 9.79 8 12H10C10 10.9 10.9 10 12 10V8M12 14C13.1 14 14 13.1 14 12S13.1 10 12 10 10 10.9 10 12 10.9 14 12 14Z" />
    </svg>
  );
}
