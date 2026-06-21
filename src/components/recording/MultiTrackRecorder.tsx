import { useState, useEffect, useCallback, useRef } from 'react';
import { useRecordingStore } from '../../stores/recording-store';
import { useTimelineStore } from '../../stores/timeline-store';
import { usePatternStore } from '../../stores/pattern-store';

interface MultiTrackRecorderProps {
  onClose?: () => void;
}

export function MultiTrackRecorder({ onClose }: MultiTrackRecorderProps) {
  const {
    availableDevices,
    recordingTracks,
    isRecording,
    recordingDuration,
    countInEnabled,
    countInBars,
    refreshDevices,
    addRecordingTrack,
    removeRecordingTrack,
    setTrackDevice,
    setTrackArmed,
    setTrackMonitoring,
    startRecording,
    stopRecording,
    cancelRecording,
    setCountInEnabled,
    setCountInBars,
    setRecordingDuration,
    lastResults,
  } = useRecordingStore();

  const { addTrack, addClip, tracks } = useTimelineStore();
  const { globalBpm } = usePatternStore();

  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const durationIntervalRef = useRef<number | null>(null);
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());

  // Initialize devices on mount
  useEffect(() => {
    const init = async () => {
      try {
        await refreshDevices();
        setIsInitialized(true);
      } catch (err) {
        setError('Failed to access audio devices. Please grant microphone permission.');
      }
    };
    init();
  }, [refreshDevices]);

  // Start monitoring when tracks are added
  useEffect(() => {
    recordingTracks.forEach(track => {
      if (track.armed && !track.monitoring && !isRecording) {
        setTrackMonitoring(track.id, true);
      }
    });
  }, [recordingTracks, isRecording, setTrackMonitoring]);

  // Handle recording duration timer
  useEffect(() => {
    if (isRecording) {
      durationIntervalRef.current = window.setInterval(() => {
        setRecordingDuration(recordingDuration + 0.1);
      }, 100);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording, recordingDuration, setRecordingDuration]);

  // Handle recording results
  useEffect(() => {
    if (lastResults.length > 0) {
      // Add results to timeline
      lastResults.forEach(result => {
        // Store audio buffer
        const bufferId = crypto.randomUUID();
        audioBuffersRef.current.set(bufferId, result.audioBuffer);

        // Find or create track in timeline
        let trackId: string;
        const existingTrack = tracks.find(t => t.name === result.trackName);
        if (!existingTrack) {
          trackId = addTrack('audio', result.trackName);
        } else {
          trackId = existingTrack.id;
        }

        // Add clip
        const trackClips = useTimelineStore.getState().getClipsForTrack(trackId);
        const endBeat = trackClips.reduce((max, clip) => Math.max(max, clip.startBeat + clip.duration), 0);

        addClip({
          trackId,
          type: 'audio',
          name: `${result.trackName} Take ${trackClips.length + 1}`,
          startBeat: endBeat,
          duration: result.durationBeats,
          color: '#58d68d',
          audioBufferId: bufferId,
        });
      });
    }
  }, [lastResults, tracks, addTrack, addClip]);

  const handleAddTrack = useCallback(() => {
    if (availableDevices.length === 0) {
      setError('No audio input devices available');
      return;
    }

    const trackNumber = recordingTracks.length + 1;
    addRecordingTrack(`Track ${trackNumber}`, availableDevices[0].deviceId);
  }, [availableDevices, recordingTracks.length, addRecordingTrack]);

  const handleStartRecording = useCallback(async () => {
    const armedTracks = recordingTracks.filter(t => t.armed);
    if (armedTracks.length === 0) {
      setError('No tracks armed for recording');
      return;
    }

    setError(null);
    setRecordingDuration(0);

    try {
      await startRecording(globalBpm);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [recordingTracks, globalBpm, startRecording, setRecordingDuration]);

  const handleStopRecording = useCallback(async () => {
    await stopRecording(globalBpm);
  }, [globalBpm, stopRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  if (!isInitialized) {
    return (
      <div className="multi-track-recorder">
        <div className="multi-track-recorder-loading">
          <p>Initializing audio devices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="multi-track-recorder">
      <div className="multi-track-recorder-header">
        <h3>Multi-Track Recording</h3>
        {onClose && (
          <button className="btn btn--sm" onClick={onClose}>
            Close
          </button>
        )}
      </div>

      {error && (
        <div className="multi-track-recorder-error">
          {error}
        </div>
      )}

      {/* Settings */}
      <div className="multi-track-recorder-settings">
        <div className="setting-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={countInEnabled}
              onChange={(e) => setCountInEnabled(e.target.checked)}
              disabled={isRecording}
            />
            Count-in
          </label>
          {countInEnabled && (
            <select
              value={countInBars}
              onChange={(e) => setCountInBars(Number(e.target.value))}
              disabled={isRecording}
            >
              <option value={1}>1 bar</option>
              <option value={2}>2 bars</option>
              <option value={4}>4 bars</option>
            </select>
          )}
        </div>

        <div className="setting-group">
          <span className="bpm-display">BPM: {globalBpm}</span>
        </div>
      </div>

      {/* Track List */}
      <div className="multi-track-recorder-tracks">
        <div className="track-list-header">
          <span>Input Tracks</span>
          <button
            className="btn btn--sm"
            onClick={handleAddTrack}
            disabled={isRecording || availableDevices.length === 0}
          >
            + Add Track
          </button>
        </div>

        {recordingTracks.length === 0 ? (
          <div className="empty-tracks">
            <p>No recording tracks. Click "Add Track" to create one.</p>
          </div>
        ) : (
          <div className="track-list">
            {recordingTracks.map((track, index) => (
              <RecordingTrackRow
                key={track.id}
                track={track}
                index={index}
                devices={availableDevices}
                isRecording={isRecording}
                onRemove={() => removeRecordingTrack(track.id)}
                onDeviceChange={(deviceId) => setTrackDevice(track.id, deviceId)}
                onArmedChange={(armed) => setTrackArmed(track.id, armed)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="recording-status-bar">
          <div className="recording-indicator">
            <div className="recording-dot" />
            <span>Recording</span>
          </div>
          <span className="recording-time">{formatDuration(recordingDuration)}</span>
        </div>
      )}

      {/* Controls */}
      <div className="multi-track-recorder-controls">
        {!isRecording ? (
          <button
            className="btn btn--primary btn--large record-btn"
            onClick={handleStartRecording}
            disabled={recordingTracks.filter(t => t.armed).length === 0}
          >
            Record All Armed Tracks
          </button>
        ) : (
          <>
            <button
              className="btn btn--danger btn--large"
              onClick={handleStopRecording}
            >
              Stop Recording
            </button>
            <button
              className="btn btn--large"
              onClick={cancelRecording}
            >
              Cancel
            </button>
          </>
        )}
      </div>

      <p className="help-text">
        Recordings will be added to the timeline with matching track names.
        Arm multiple tracks to record them simultaneously.
      </p>
    </div>
  );
}

// Individual track row component
interface RecordingTrackRowProps {
  track: {
    id: string;
    name: string;
    deviceId: string;
    armed: boolean;
    monitoring: boolean;
    level: number;
  };
  index: number;
  devices: { deviceId: string; label: string }[];
  isRecording: boolean;
  onRemove: () => void;
  onDeviceChange: (deviceId: string) => void;
  onArmedChange: (armed: boolean) => void;
}

function RecordingTrackRow({
  track,
  index,
  devices,
  isRecording,
  onRemove,
  onDeviceChange,
  onArmedChange,
}: RecordingTrackRowProps) {
  return (
    <div className={`recording-track-row ${track.armed ? 'armed' : ''}`}>
      <div className="track-number">{index + 1}</div>

      {/* Arm button */}
      <button
        className={`arm-btn ${track.armed ? 'active' : ''}`}
        onClick={() => onArmedChange(!track.armed)}
        disabled={isRecording}
        title={track.armed ? 'Disarm track' : 'Arm track for recording'}
      >
        R
      </button>

      {/* Track name */}
      <input
        type="text"
        className="track-name-input"
        value={track.name}
        onChange={() => {}} // Read-only for now
        disabled={isRecording}
      />

      {/* Device selector */}
      <select
        className="device-select"
        value={track.deviceId}
        onChange={(e) => onDeviceChange(e.target.value)}
        disabled={isRecording}
      >
        {devices.map(device => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label}
          </option>
        ))}
      </select>

      {/* Level meter */}
      <div className="track-level-meter">
        <div
          className="track-level-fill"
          style={{
            width: `${track.level * 100}%`,
            backgroundColor: track.level > 0.8 ? '#e74c3c' : '#2ecc71',
          }}
        />
      </div>

      {/* Remove button */}
      <button
        className="remove-track-btn"
        onClick={onRemove}
        disabled={isRecording}
        title="Remove track"
      >
        x
      </button>
    </div>
  );
}
