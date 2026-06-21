import { useState, useCallback, useEffect } from 'react';
import { useTimelineStore } from '../../stores/timeline-store';
import { useProjectStore } from '../../stores/project-store';
import { useInstrumentStore } from '../../stores/instrument-store';
import { useUIStore } from '../../stores/ui-store';
import { TimeRuler } from '../timeline/TimeRuler';
import { TrackHeader } from '../timeline/TrackHeader';
import { TimelineCanvas } from '../timeline/TimelineCanvas';
import { ClipPropertiesPanel } from '../editing/ClipPropertiesPanel';
import type { TimeSignature } from '../../audio/timing/time-utils';

const DEFAULT_TOTAL_BEATS = 64; // 16 bars at 4/4
const DEFAULT_PIXELS_PER_BEAT = 30;

export function ArrangementView() {
  // Stores
  const tracks = useTimelineStore((s) => s.tracks);
  const clips = useTimelineStore((s) => s.clips);
  const addTrack = useTimelineStore((s) => s.addTrack);
  const removeTrack = useTimelineStore((s) => s.removeTrack);
  const updateTrack = useTimelineStore((s) => s.updateTrack);
  const addClip = useTimelineStore((s) => s.addClip);
  const selectClip = useTimelineStore((s) => s.selectClip);
  const clearSelection = useTimelineStore((s) => s.clearSelection);
  const selection = useTimelineStore((s) => s.selection);

  const bpm = useProjectStore((s) => s.bpm);
  const isPlaying = useProjectStore((s) => s.isPlaying);
  const currentTime = useProjectStore((s) => s.currentTime);
  const setCurrentTime = useProjectStore((s) => s.setCurrentTime);
  const isLooping = useProjectStore((s) => s.isLooping);
  const loopStart = useProjectStore((s) => s.loopStart);
  const loopEnd = useProjectStore((s) => s.loopEnd);
  const setLoopPoints = useProjectStore((s) => s.setLoopPoints);

  const instruments = useInstrumentStore((s) => s.instruments);
  const setView = useUIStore((s) => s.setView);

  // Local state
  const [pixelsPerBeat, setPixelsPerBeat] = useState(DEFAULT_PIXELS_PER_BEAT);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);

  const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
  const totalBeats = DEFAULT_TOTAL_BEATS;
  const currentBeat = (currentTime * bpm) / 60;

  // Selected clip IDs from store
  const selectedClipIds = new Set(selection?.type === 'clip' ? selection.ids : []);

  // Get the first selected clip ID for the properties panel
  const selectedClipId = selection?.type === 'clip' && selection.ids.length > 0
    ? selection.ids[0]
    : null;

  const handleAddAudioTrack = () => {
    const id = addTrack('audio');
    setSelectedTrackId(id);
  };

  const handleAddMidiTrack = () => {
    // Create MIDI track and associate with first instrument if available
    const instrumentId = instruments.length > 0 ? instruments[0].id : undefined;
    const id = addTrack('midi', undefined, instrumentId);
    setSelectedTrackId(id);
  };

  const handleTrackSelect = (trackId: string) => {
    setSelectedTrackId(trackId);
  };

  const handleScrollChange = useCallback((x: number, y: number) => {
    setScrollX(x);
    setScrollY(y);
  }, []);

  const handlePositionChange = useCallback((beat: number) => {
    const time = (beat * 60) / bpm;
    setCurrentTime(time);
  }, [bpm, setCurrentTime]);

  const handleLoopChange = useCallback((start: number, end: number) => {
    const startTime = (start * 60) / bpm;
    const endTime = (end * 60) / bpm;
    setLoopPoints(startTime, endTime);
  }, [bpm, setLoopPoints]);

  const handleClipSelect = useCallback((clipId: string, addToSelection: boolean) => {
    selectClip(clipId, addToSelection);
  }, [selectClip]);

  const handleClipDoubleClick = useCallback((clipId: string) => {
    const clip = clips.find((c) => c.id === clipId);
    if (clip?.type === 'midi') {
      // Switch to piano roll view
      setView('piano-roll');
    }
  }, [clips, setView]);

  const moveClip = useTimelineStore(s => s.moveClip);
  const handleClipMove = useCallback((clipId: string, trackId: string, startBeat: number) => {
    moveClip(clipId, trackId, startBeat);
  }, [moveClip]);

  const handleZoom = useCallback((delta: number) => {
    setPixelsPerBeat((prev) => Math.max(10, Math.min(100, prev + delta)));
  }, []);

  // Add empty clip to selected track
  const handleAddClip = () => {
    if (!selectedTrackId) return;

    const track = tracks.find((t) => t.id === selectedTrackId);
    if (!track) return;

    // Find a good position (after existing clips on this track)
    const trackClips = clips.filter((c) => c.trackId === selectedTrackId);
    const lastClipEnd = trackClips.reduce((max, c) => Math.max(max, c.startBeat + c.duration), 0);
    const startBeat = Math.ceil(lastClipEnd / 4) * 4; // Start on next bar

    if (track.type === 'midi') {
      addClip({
        trackId: selectedTrackId,
        type: 'midi',
        name: `MIDI ${clips.filter((c) => c.type === 'midi').length + 1}`,
        startBeat,
        duration: 4, // 1 bar
        color: track.color,
        notes: [],
        instrumentId: track.instrumentId,
      });
    } else {
      addClip({
        trackId: selectedTrackId,
        type: 'audio',
        name: `Audio ${clips.filter((c) => c.type === 'audio').length + 1}`,
        startBeat,
        duration: 4, // 1 bar placeholder
        color: track.color,
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete selected clips
        if (selection?.type === 'clip') {
          for (const id of selection.ids) {
            useTimelineStore.getState().removeClip(id);
          }
        }
      }

      // Toggle properties panel with P key
      if (e.key === 'p' || e.key === 'P') {
        setShowPropertiesPanel((prev) => !prev);
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, clearSelection]);

  const loopStartBeat = (loopStart * bpm) / 60;
  const loopEndBeat = (loopEnd * bpm) / 60;

  return (
    <div className={showPropertiesPanel && selectedClipId ? 'arrangement-view-with-panel' : ''}>
      <div className="arrangement-view">
        <div className="arrangement-toolbar">
          <div className="toolbar-group">
            <button className="btn btn-sm" onClick={handleAddAudioTrack}>
              + Audio Track
            </button>
            <button className="btn btn-sm" onClick={handleAddMidiTrack}>
              + MIDI Track
            </button>
            <button
              className="btn btn-sm"
              onClick={handleAddClip}
              disabled={!selectedTrackId}
            >
              + Clip
            </button>
          </div>

          <div className="toolbar-group">
            <button onClick={() => handleZoom(-5)}>-</button>
            <span className="zoom-value">{Math.round(pixelsPerBeat)}px</span>
            <button onClick={() => handleZoom(5)}>+</button>
          </div>

          <div className="toolbar-group">
            <button
              className={`btn btn-sm ${showPropertiesPanel ? 'btn--active' : ''}`}
              onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
              title="Toggle Properties Panel (P)"
            >
              Properties
            </button>
          </div>
        </div>

        <div className="arrangement-content">
          {/* Track headers */}
          <div className="track-headers">
            <div className="ruler-spacer" />
            {tracks.map((track) => (
              <TrackHeader
                key={track.id}
                track={track}
                isSelected={selectedTrackId === track.id}
                onSelect={() => handleTrackSelect(track.id)}
                onNameChange={(name) => updateTrack(track.id, { name })}
                onMuteToggle={() => updateTrack(track.id, { muted: !track.muted })}
                onSoloToggle={() => updateTrack(track.id, { solo: !track.solo })}
                onArmToggle={() => updateTrack(track.id, { armed: !track.armed })}
                onRemove={() => removeTrack(track.id)}
              />
            ))}
            {tracks.length === 0 && (
              <div className="no-tracks-message">
                No tracks. Add an audio or MIDI track above.
              </div>
            )}
          </div>

          {/* Timeline area */}
          <div className="timeline-area">
            <TimeRuler
              pixelsPerBeat={pixelsPerBeat}
              scrollX={scrollX}
              width={800}
              timeSignature={timeSignature}
              totalBeats={totalBeats}
              currentBeat={currentBeat}
              loopStart={loopStartBeat}
              loopEnd={loopEndBeat}
              loopEnabled={isLooping}
              onPositionClick={handlePositionChange}
              onLoopChange={handleLoopChange}
            />

            <TimelineCanvas
              tracks={tracks}
              clips={clips}
              pixelsPerBeat={pixelsPerBeat}
              scrollX={scrollX}
              scrollY={scrollY}
              totalBeats={totalBeats}
              beatsPerBar={timeSignature.numerator}
              currentBeat={currentBeat}
              loopStart={loopStartBeat}
              loopEnd={loopEndBeat}
              loopEnabled={isLooping}
              selectedClipIds={selectedClipIds}
              onClipSelect={handleClipSelect}
              onClipDoubleClick={handleClipDoubleClick}
              onClipMove={handleClipMove}
              onScrollChange={handleScrollChange}
              onLoopChange={handleLoopChange}
              onPositionChange={handlePositionChange}
            />
          </div>
        </div>
      </div>

      {/* Properties Panel */}
      {showPropertiesPanel && (
        <ClipPropertiesPanel
          clipId={selectedClipId}
          onClose={() => setShowPropertiesPanel(false)}
        />
      )}
    </div>
  );
}
