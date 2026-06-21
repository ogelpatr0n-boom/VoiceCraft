import { useState, useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import { useInstrumentStore } from '../../stores/instrument-store';
import { useTimelineStore } from '../../stores/timeline-store';
import { usePatternStore } from '../../stores/pattern-store';
import { useLoopPlayback } from '../../hooks/useLoopPlayback';
import { VocalRecorder } from '../recording/VocalRecorder';
import { MultiTrackRecorder } from '../recording/MultiTrackRecorder';
import { loopEngine } from '../../audio/loops/loop-engine';

const TRACK_COLORS = [
  '#00d4ff', '#ff6b35', '#4ecdc4', '#f7dc6f',
  '#bb8fce', '#58d68d', '#ec7063', '#5dade2'
];

export function SessionView() {
  const { tracks, clips, addTrack, removeTrack, updateTrack, addClip, removeClip, getClipsForTrack } = useTimelineStore();
  const instruments = useInstrumentStore((s) => s.instruments);
  const { getLoopingPatterns, globalBpm, setGlobalBpm } = usePatternStore();

  const {
    isRunning,
    currentBeat,
    currentBar,
    activeLoopCount,
    activePatternIds,
    stopAll,
    setBpm,
  } = useLoopPlayback();

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmLocal] = useState(globalBpm);
  const [bars, setBars] = useState(4);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [showVocalRecorder, setShowVocalRecorder] = useState(false);
  const [showMultiTrack, setShowMultiTrack] = useState(false);

  const beatIntervalRef = useRef<number | null>(null);
  const [localCurrentBeat, setLocalCurrentBeat] = useState(0);

  // Sync BPM
  useEffect(() => {
    setGlobalBpm(bpm);
    setBpm(bpm);
    Tone.getTransport().bpm.value = bpm;
  }, [bpm, setGlobalBpm, setBpm]);

  // Create default tracks if none exist
  useEffect(() => {
    if (tracks.length === 0) {
      // Create initial tracks based on instruments
      const drumInst = instruments.find(i => i.type === 'drums');
      const bassInst = instruments.find(i => i.type === 'bass');
      const synthInst = instruments.find(i => i.type === 'synth');

      if (drumInst) addTrack('midi', 'Drums', drumInst.id);
      if (bassInst) addTrack('midi', 'Bass', bassInst.id);
      if (synthInst) addTrack('midi', 'Synth', synthInst.id);

      // Add vocals track
      addTrack('audio', 'Vocals');
    }
  }, [tracks.length, instruments, addTrack]);

  const handlePlay = useCallback(async () => {
    try {
      await Tone.start();
      if (Tone.getContext().state !== 'running') {
        await Tone.getContext().resume();
      }

      Tone.getTransport().bpm.value = bpm;

      if (isPlaying) {
        Tone.getTransport().pause();
        setIsPlaying(false);
        if (beatIntervalRef.current) {
          clearInterval(beatIntervalRef.current);
        }
      } else {
        Tone.getTransport().start();
        setIsPlaying(true);

        // Track beat position
        const beatDuration = (60 / bpm) * 1000;
        beatIntervalRef.current = window.setInterval(() => {
          setLocalCurrentBeat(prev => (prev + 1) % (bars * 4));
        }, beatDuration);
      }
    } catch (e) {
      console.warn('Failed to control transport:', e);
    }
  }, [isPlaying, bpm, bars]);

  const handleStop = useCallback(() => {
    try {
      Tone.getTransport().stop();
      Tone.getTransport().position = 0;
    } catch (e) {
      // Transport may not be ready
    }
    setIsPlaying(false);
    setLocalCurrentBeat(0);
    if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current);
    }
    // Also stop all pattern loops
    stopAll();
  }, [stopAll]);

  const handleAddTrack = useCallback(() => {
    const colorIndex = tracks.length % TRACK_COLORS.length;
    addTrack('midi', `Track ${tracks.length + 1}`);
  }, [tracks.length, addTrack]);

  const handleToggleMute = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      updateTrack(trackId, { muted: !track.muted });
    }
  }, [tracks, updateTrack]);

  const handleToggleSolo = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      updateTrack(trackId, { solo: !track.solo });
    }
  }, [tracks, updateTrack]);

  const handleVolumeChange = useCallback((trackId: string, value: number) => {
    updateTrack(trackId, { gain: value });
  }, [updateTrack]);

  const handleDeleteClip = useCallback((clipId: string) => {
    removeClip(clipId);
  }, [removeClip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (beatIntervalRef.current) {
        clearInterval(beatIntervalRef.current);
      }
    };
  }, []);

  // Get looping patterns to show as "live" clips
  const loopingPatterns = getLoopingPatterns();

  // Calculate current beat display
  const displayBeat = isRunning ? currentBeat : localCurrentBeat;
  const displayBar = isRunning ? currentBar : Math.floor(localCurrentBeat / 4);
  const displayBeatInBar = isRunning ? currentBeat : localCurrentBeat % 4;

  return (
    <div className="session-view">
      {/* Transport Controls */}
      <div className="session-transport">
        <div className="transport-controls">
          <button
            className={`btn ${isPlaying || isRunning ? 'btn--danger' : 'btn--primary'}`}
            onClick={handlePlay}
          >
            {isPlaying || isRunning ? 'Pause' : 'Play All'}
          </button>
          <button className="btn" onClick={handleStop}>
            Stop
          </button>
        </div>

        <div className="transport-settings">
          <div className="setting-group">
            <label>BPM</label>
            <input
              type="number"
              min={60}
              max={200}
              value={bpm}
              onChange={(e) => setBpmLocal(Number(e.target.value))}
            />
          </div>
          <div className="setting-group">
            <label>Bars</label>
            <select value={bars} onChange={(e) => setBars(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={8}>8</option>
            </select>
          </div>
        </div>

        <div className="beat-indicator">
          <div className="beat-counter">
            {displayBar + 1}.{displayBeatInBar + 1}
          </div>
          {Array.from({ length: Math.min(bars * 4, 16) }, (_, i) => (
            <div
              key={i}
              className={`beat-dot ${
                (isPlaying || isRunning) && i === displayBeat ? 'active' : ''
              } ${i % 4 === 0 ? 'downbeat' : ''}`}
            />
          ))}
        </div>

        {/* Loop status */}
        {activeLoopCount > 0 && (
          <div className="loop-status-badge">
            <div className="loop-status-dot" />
            <span>{activeLoopCount} looping</span>
          </div>
        )}
      </div>

      {/* Track Grid */}
      <div className="session-grid">
        <div className="grid-header">
          <div className="track-label-header">Track</div>
          <div className="clips-header">Clips</div>
          <div className="mixer-header">Mix</div>
        </div>

        {tracks.map((track) => {
          const trackClips = getClipsForTrack(track.id);
          // Find looping patterns for this track's instrument
          const trackLoopingPatterns = loopingPatterns.filter(
            p => p.instrumentId === track.instrumentId
          );

          return (
            <div
              key={track.id}
              className={`session-track ${selectedTrack === track.id ? 'selected' : ''} ${track.muted ? 'muted' : ''}`}
              style={{ '--track-color': track.color } as React.CSSProperties}
            >
              {/* Track Info */}
              <div className="track-info" onClick={() => setSelectedTrack(track.id)}>
                <div className="track-color-bar" style={{ background: track.color }} />
                <input
                  className="track-name"
                  value={track.name}
                  onChange={(e) => updateTrack(track.id, { name: e.target.value })}
                />
                <span className="track-type-badge">{track.type}</span>
              </div>

              {/* Clips */}
              <div className="track-clips">
                {/* Show looping patterns as live indicators */}
                {trackLoopingPatterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="clip-slot looping"
                    style={{ background: track.color }}
                  >
                    <span className="clip-name">{pattern.name}</span>
                    <span className="clip-bars">{pattern.bars} bars</span>
                    <div className="clip-looping-indicator" />
                  </div>
                ))}

                {/* Show saved clips */}
                {trackClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="clip-slot"
                    style={{ background: clip.color }}
                  >
                    <span className="clip-name">{clip.name}</span>
                    <span className="clip-bars">{Math.ceil(clip.duration / 4)} bars</span>
                    <button
                      className="clip-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClip(clip.id);
                      }}
                    >
                      x
                    </button>
                  </div>
                ))}

                {trackClips.length === 0 && trackLoopingPatterns.length === 0 && (
                  <div className="empty-track-hint">
                    Create patterns in Instruments view
                  </div>
                )}
              </div>

              {/* Track Mixer */}
              <div className="track-mixer">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={track.gain}
                  onChange={(e) => handleVolumeChange(track.id, Number(e.target.value))}
                  className="volume-slider"
                />
                <div className="mixer-buttons">
                  <button
                    className={`mixer-btn ${track.muted ? 'active' : ''}`}
                    onClick={() => handleToggleMute(track.id)}
                  >
                    M
                  </button>
                  <button
                    className={`mixer-btn ${track.solo ? 'active' : ''}`}
                    onClick={() => handleToggleSolo(track.id)}
                  >
                    S
                  </button>
                  <button
                    className="mixer-btn delete"
                    onClick={() => removeTrack(track.id)}
                  >
                    x
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Track Button */}
        <button className="add-track-btn" onClick={handleAddTrack}>
          + Add Track
        </button>
      </div>

      {/* Recording Section */}
      <div className="session-recording">
        <div className="recording-header">
          <h4>Recording</h4>
          <div className="recording-buttons">
            <button
              className={`btn btn--sm ${showVocalRecorder ? 'btn--active' : ''}`}
              onClick={() => {
                setShowVocalRecorder(!showVocalRecorder);
                if (!showVocalRecorder) setShowMultiTrack(false);
              }}
            >
              {showVocalRecorder ? 'Hide' : 'Quick Vocal'}
            </button>
            <button
              className={`btn btn--sm ${showMultiTrack ? 'btn--active' : ''}`}
              onClick={() => {
                setShowMultiTrack(!showMultiTrack);
                if (!showMultiTrack) setShowVocalRecorder(false);
              }}
            >
              {showMultiTrack ? 'Hide' : 'Multi-Track'}
            </button>
          </div>
        </div>

        {showVocalRecorder && (
          <VocalRecorder
            onRecordingComplete={(result) => {
              console.log('Recording complete:', result);
            }}
          />
        )}

        {showMultiTrack && (
          <MultiTrackRecorder
            onClose={() => setShowMultiTrack(false)}
          />
        )}
      </div>

      {/* Instructions */}
      <div className="session-help">
        <h4>Loop-Based Workflow</h4>
        <ul>
          <li><strong>Create patterns</strong> in the Instruments view</li>
          <li><strong>Loop patterns</strong> to hear them repeat</li>
          <li><strong>Save to Session</strong> to add clips here</li>
          <li><strong>Layer instruments</strong> - drums + bass + synth</li>
          <li><strong>Record vocals</strong> synced to the loop</li>
          <li>All patterns play together in sync at {bpm} BPM</li>
        </ul>
      </div>
    </div>
  );
}
