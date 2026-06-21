import type { TimelineTrack } from '../../stores/timeline-store';

interface TrackHeaderProps {
  track: TimelineTrack;
  isSelected: boolean;
  onSelect: () => void;
  onNameChange: (name: string) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onArmToggle: () => void;
  onRemove: () => void;
}

export function TrackHeader({
  track,
  isSelected,
  onSelect,
  onNameChange,
  onMuteToggle,
  onSoloToggle,
  onArmToggle,
  onRemove,
}: TrackHeaderProps) {
  return (
    <div
      className={`track-header ${isSelected ? 'selected' : ''}`}
      style={{ height: track.height, borderLeftColor: track.color }}
      onClick={onSelect}
    >
      <div className="track-header-top">
        <div
          className="track-color-indicator"
          style={{ backgroundColor: track.color }}
        />
        <input
          type="text"
          className="track-name-input"
          value={track.name}
          onChange={(e) => onNameChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="track-header-controls">
        <button
          className={`track-btn ${track.muted ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
          title="Mute"
        >
          M
        </button>
        <button
          className={`track-btn ${track.solo ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onSoloToggle(); }}
          title="Solo"
        >
          S
        </button>
        <button
          className={`track-btn record-btn ${track.armed ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onArmToggle(); }}
          title="Arm for Recording"
        >
          R
        </button>
        <button
          className="track-btn delete-btn"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title="Delete Track"
        >
          X
        </button>
      </div>

      <div className="track-type-badge">
        {track.type === 'midi' ? 'MIDI' : 'Audio'}
      </div>
    </div>
  );
}
