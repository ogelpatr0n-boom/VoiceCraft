import { useCallback } from 'react';
import { usePatternStore, type Pattern, isDrumPattern } from '../../stores/pattern-store';
import { useTimelineStore } from '../../stores/timeline-store';
import { patternToClip, getPatternSummary } from '../../utils/pattern-conversion';

interface PatternToolbarProps {
  patternId: string;
  pattern: Pattern;
  isLooping: boolean;
  onToggleLoop: () => void;
  onPatternChange?: (patternId: string) => void;
}

export function PatternToolbar({
  patternId,
  pattern,
  isLooping,
  onToggleLoop,
  onPatternChange,
}: PatternToolbarProps) {
  const { setPatternName, setPatternBars, duplicatePattern, deletePattern, getPatternsForInstrument } = usePatternStore();
  const { addTrack, addClip, tracks } = useTimelineStore();

  const patterns = getPatternsForInstrument(pattern.instrumentId);

  const handleSaveToSession = useCallback(() => {
    // Find or create a track for this instrument
    let track = tracks.find(t => t.instrumentId === pattern.instrumentId);
    let trackId: string;

    if (!track) {
      // Create a new track
      trackId = addTrack('midi', pattern.name, pattern.instrumentId);
    } else {
      trackId = track.id;
    }

    // Find the end of existing clips on this track
    const trackClips = useTimelineStore.getState().getClipsForTrack(trackId);
    const endBeat = trackClips.reduce((max, clip) => Math.max(max, clip.startBeat + clip.duration), 0);

    // Convert pattern to clip and add
    const clipData = patternToClip(pattern, trackId, endBeat);
    addClip(clipData);
  }, [pattern, tracks, addTrack, addClip]);

  const handleDuplicate = useCallback(() => {
    const newId = duplicatePattern(patternId);
    if (newId && onPatternChange) {
      onPatternChange(newId);
    }
  }, [patternId, duplicatePattern, onPatternChange]);

  const handleDelete = useCallback(() => {
    if (patterns.length > 1) {
      deletePattern(patternId);
    }
  }, [patternId, deletePattern, patterns.length]);

  const handleBarsChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPatternBars(patternId, Number(e.target.value));
  }, [patternId, setPatternBars]);

  return (
    <div className="pattern-toolbar">
      <div className="pattern-toolbar-left">
        <input
          type="text"
          className="pattern-name-input"
          value={pattern.name}
          onChange={(e) => setPatternName(patternId, e.target.value)}
          placeholder="Pattern name"
        />

        {patterns.length > 1 && (
          <select
            className="pattern-selector"
            value={patternId}
            onChange={(e) => onPatternChange?.(e.target.value)}
          >
            {patterns.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="pattern-toolbar-center">
        <div className="pattern-setting">
          <label>Bars</label>
          <select value={pattern.bars} onChange={handleBarsChange}>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={4}>4</option>
            <option value={8}>8</option>
          </select>
        </div>

        <span className="pattern-summary">{getPatternSummary(pattern)}</span>
      </div>

      <div className="pattern-toolbar-right">
        <button
          className={`btn btn--sm loop-btn ${isLooping ? 'btn--active' : ''}`}
          onClick={onToggleLoop}
          title={isLooping ? 'Stop Loop' : 'Start Loop'}
        >
          {isLooping ? 'Stop' : 'Loop'}
        </button>

        <button
          className="btn btn--sm btn--primary"
          onClick={handleSaveToSession}
          title="Save pattern to Session"
        >
          Save to Session
        </button>

        <button
          className="btn btn--sm"
          onClick={handleDuplicate}
          title="Duplicate pattern"
        >
          Copy
        </button>

        {patterns.length > 1 && (
          <button
            className="btn btn--sm btn--danger"
            onClick={handleDelete}
            title="Delete pattern"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
