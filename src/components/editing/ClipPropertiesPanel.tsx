import { useState, useCallback, useEffect } from 'react';
import { useTimelineStore, type TimelineClip } from '../../stores/timeline-store';
import { useProjectStore } from '../../stores/project-store';
import { Knob } from '../controls/Knob';

interface ClipPropertiesPanelProps {
  clipId: string | null;
  onClose?: () => void;
}

export function ClipPropertiesPanel({ clipId, onClose }: ClipPropertiesPanelProps) {
  const { clips, updateClip, splitClip, duplicateClip, removeClip } = useTimelineStore();
  const bpm = useProjectStore((s) => s.bpm);

  const clip = clipId ? clips.find((c) => c.id === clipId) : null;

  const [splitPosition, setSplitPosition] = useState(50); // Percentage

  if (!clip) {
    return (
      <div className="clip-properties-panel empty">
        <p>Select a clip to edit its properties</p>
      </div>
    );
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateClip(clip.id, { name: e.target.value });
  };

  const handleStartChange = (value: number) => {
    updateClip(clip.id, { startBeat: Math.max(0, value) });
  };

  const handleDurationChange = (value: number) => {
    updateClip(clip.id, { duration: Math.max(0.25, value) });
  };

  const handleTrimStartChange = (value: number) => {
    updateClip(clip.id, { trimStart: Math.max(0, value) });
  };

  const handleTrimEndChange = (value: number) => {
    updateClip(clip.id, { trimEnd: Math.max(0, value) });
  };

  const handleSplit = () => {
    const splitBeat = clip.startBeat + (clip.duration * splitPosition) / 100;
    splitClip(clip.id, splitBeat);
  };

  const handleDuplicate = () => {
    duplicateClip(clip.id);
  };

  const handleDelete = () => {
    removeClip(clip.id);
    onClose?.();
  };

  // Convert beats to time display
  const beatsToTime = (beats: number) => {
    const seconds = (beats * 60) / bpm;
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  // Convert beats to bars:beats display
  const beatsToBarsBeat = (beats: number) => {
    const bar = Math.floor(beats / 4) + 1;
    const beat = (beats % 4) + 1;
    return `${bar}.${beat.toFixed(2)}`;
  };

  return (
    <div className="clip-properties-panel">
      <div className="panel-header">
        <h3>Clip Properties</h3>
        {onClose && (
          <button className="btn btn--sm btn--icon" onClick={onClose}>
            x
          </button>
        )}
      </div>

      <div className="panel-content">
        {/* Basic Info */}
        <div className="property-section">
          <h4>Basic</h4>
          <div className="property-row">
            <label>Name</label>
            <input
              type="text"
              value={clip.name}
              onChange={handleNameChange}
              className="property-input"
            />
          </div>
          <div className="property-row">
            <label>Type</label>
            <span className="property-value">{clip.type.toUpperCase()}</span>
          </div>
          <div className="property-row">
            <label>Color</label>
            <input
              type="color"
              value={clip.color}
              onChange={(e) => updateClip(clip.id, { color: e.target.value })}
              className="property-color"
            />
          </div>
        </div>

        {/* Position & Duration */}
        <div className="property-section">
          <h4>Position</h4>
          <div className="property-row">
            <label>Start</label>
            <div className="property-input-group">
              <input
                type="number"
                value={clip.startBeat.toFixed(2)}
                onChange={(e) => handleStartChange(parseFloat(e.target.value))}
                step="0.25"
                min="0"
                className="property-input small"
              />
              <span className="property-unit">beats</span>
            </div>
            <span className="property-secondary">{beatsToBarsBeat(clip.startBeat)}</span>
          </div>
          <div className="property-row">
            <label>Duration</label>
            <div className="property-input-group">
              <input
                type="number"
                value={clip.duration.toFixed(2)}
                onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
                step="0.25"
                min="0.25"
                className="property-input small"
              />
              <span className="property-unit">beats</span>
            </div>
            <span className="property-secondary">{beatsToTime(clip.duration)}</span>
          </div>
          <div className="property-row">
            <label>End</label>
            <span className="property-value">
              {beatsToBarsBeat(clip.startBeat + clip.duration)}
            </span>
          </div>
        </div>

        {/* Trim & Fade (for audio clips) */}
        {clip.type === 'audio' && (
          <div className="property-section">
            <h4>Trim & Fade</h4>
            <div className="property-row">
              <label>Trim Start</label>
              <div className="property-input-group">
                <input
                  type="number"
                  value={(clip.trimStart || 0).toFixed(3)}
                  onChange={(e) => handleTrimStartChange(parseFloat(e.target.value))}
                  step="0.01"
                  min="0"
                  className="property-input small"
                />
                <span className="property-unit">sec</span>
              </div>
            </div>
            <div className="property-row">
              <label>Trim End</label>
              <div className="property-input-group">
                <input
                  type="number"
                  value={(clip.trimEnd || 0).toFixed(3)}
                  onChange={(e) => handleTrimEndChange(parseFloat(e.target.value))}
                  step="0.01"
                  min="0"
                  className="property-input small"
                />
                <span className="property-unit">sec</span>
              </div>
            </div>
            <div className="fade-controls">
              <div className="fade-control">
                <label>Fade In</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={clip.trimStart || 0}
                  onChange={(e) => handleTrimStartChange(parseFloat(e.target.value))}
                />
                <span>{((clip.trimStart || 0) * 1000).toFixed(0)}ms</span>
              </div>
              <div className="fade-control">
                <label>Fade Out</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={clip.trimEnd || 0}
                  onChange={(e) => handleTrimEndChange(parseFloat(e.target.value))}
                />
                <span>{((clip.trimEnd || 0) * 1000).toFixed(0)}ms</span>
              </div>
            </div>
          </div>
        )}

        {/* Split Tool */}
        <div className="property-section">
          <h4>Split</h4>
          <div className="split-tool">
            <input
              type="range"
              min="10"
              max="90"
              value={splitPosition}
              onChange={(e) => setSplitPosition(parseInt(e.target.value))}
              className="split-slider"
            />
            <div className="split-info">
              <span>Position: {splitPosition}%</span>
              <span>
                At beat {(clip.startBeat + (clip.duration * splitPosition) / 100).toFixed(2)}
              </span>
            </div>
            <button className="btn btn--sm" onClick={handleSplit}>
              Split Clip
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="property-section">
          <h4>Actions</h4>
          <div className="action-buttons">
            <button className="btn btn--sm" onClick={handleDuplicate}>
              Duplicate
            </button>
            <button className="btn btn--sm btn--danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>

        {/* MIDI-specific properties */}
        {clip.type === 'midi' && clip.notes && (
          <div className="property-section">
            <h4>MIDI Info</h4>
            <div className="property-row">
              <label>Notes</label>
              <span className="property-value">{clip.notes.length}</span>
            </div>
            {clip.instrumentId && (
              <div className="property-row">
                <label>Instrument</label>
                <span className="property-value">{clip.instrumentId}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
