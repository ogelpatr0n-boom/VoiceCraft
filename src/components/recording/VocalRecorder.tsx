import { useState, useCallback, useEffect, useRef } from 'react';
import { microphoneRecorder, type RecordingResult } from '../../audio/recording/microphone-recorder';
import { useTimelineStore } from '../../stores/timeline-store';
import { usePatternStore } from '../../stores/pattern-store';
import { loopEngine } from '../../audio/loops/loop-engine';

interface VocalRecorderProps {
  onRecordingComplete?: (result: RecordingResult) => void;
}

export function VocalRecorder({ onRecordingComplete }: VocalRecorderProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCountingIn, setIsCountingIn] = useState(false);
  const [level, setLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [countInEnabled, setCountInEnabled] = useState(true);
  const [countInBars, setCountInBars] = useState(1);

  const { addTrack, addClip, tracks } = useTimelineStore();
  const { globalBpm } = usePatternStore();

  const durationIntervalRef = useRef<number | null>(null);
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());

  // Request permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      if (microphoneRecorder.hasPermission()) {
        setHasPermission(true);
      }
    };
    checkPermission();

    return () => {
      microphoneRecorder.dispose();
    };
  }, []);

  // Set up callbacks
  useEffect(() => {
    microphoneRecorder.setOnLevel(setLevel);

    microphoneRecorder.setOnData((result) => {
      setIsRecording(false);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      // Store the audio buffer and add to timeline
      const bufferId = crypto.randomUUID();
      audioBuffersRef.current.set(bufferId, result.audioBuffer);

      // Find or create vocals track
      let trackId: string;
      const vocalsTrack = tracks.find(t => t.name === 'Vocals');
      if (!vocalsTrack) {
        trackId = addTrack('audio', 'Vocals');
      } else {
        trackId = vocalsTrack.id;
      }

      // Find the end of existing clips
      const trackClips = useTimelineStore.getState().getClipsForTrack(trackId);
      const endBeat = trackClips.reduce((max, clip) => Math.max(max, clip.startBeat + clip.duration), 0);

      // Add clip
      addClip({
        trackId,
        type: 'audio',
        name: `Vocal ${trackClips.length + 1}`,
        startBeat: endBeat,
        duration: result.durationBeats,
        color: '#bb8fce',
        audioBufferId: bufferId,
      });

      onRecordingComplete?.(result);
    });

    microphoneRecorder.setOnError((err) => {
      setError(err.message);
      setIsRecording(false);
      setIsCountingIn(false);
    });

    return () => {
      microphoneRecorder.setOnLevel(() => {});
      microphoneRecorder.setOnData(() => {});
      microphoneRecorder.setOnError(() => {});
    };
  }, [tracks, addTrack, addClip, onRecordingComplete]);

  const handleRequestPermission = useCallback(async () => {
    setError(null);
    const granted = await microphoneRecorder.requestPermission();
    setHasPermission(granted);
    if (!granted) {
      setError('Microphone permission denied. Please allow access in your browser settings.');
    }
  }, []);

  const handleStartRecording = useCallback(async () => {
    setError(null);
    setRecordingDuration(0);

    const bpm = loopEngine.getBpm() || globalBpm;

    if (countInEnabled) {
      setIsCountingIn(true);
      await microphoneRecorder.startRecording({
        countIn: true,
        countInBars,
        bpm,
      });
      setIsCountingIn(false);
    } else {
      await microphoneRecorder.startRecording({ bpm });
    }

    setIsRecording(true);

    // Track duration
    durationIntervalRef.current = window.setInterval(() => {
      setRecordingDuration(prev => prev + 0.1);
    }, 100);
  }, [countInEnabled, countInBars, globalBpm]);

  const handleStopRecording = useCallback(() => {
    microphoneRecorder.stopRecording();
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  }, []);

  const handleCancelRecording = useCallback(() => {
    microphoneRecorder.cancelRecording();
    setIsRecording(false);
    setIsCountingIn(false);
    setRecordingDuration(0);
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  if (!hasPermission) {
    return (
      <div className="vocal-recorder">
        <div className="vocal-recorder-permission">
          <div className="mic-icon">Mic</div>
          <p>Microphone access required for vocal recording</p>
          <button className="btn btn--primary" onClick={handleRequestPermission}>
            Allow Microphone
          </button>
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="vocal-recorder">
      <div className="vocal-recorder-header">
        <h4>Vocal Recording</h4>
        {!isRecording && !isCountingIn && (
          <div className="count-in-settings">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={countInEnabled}
                onChange={(e) => setCountInEnabled(e.target.checked)}
              />
              Count-in
            </label>
            {countInEnabled && (
              <select
                value={countInBars}
                onChange={(e) => setCountInBars(Number(e.target.value))}
              >
                <option value={1}>1 bar</option>
                <option value={2}>2 bars</option>
              </select>
            )}
          </div>
        )}
      </div>

      <div className="vocal-recorder-main">
        {isCountingIn && (
          <div className="count-in-indicator">
            <div className="count-in-pulse" />
            <span>Count-in...</span>
          </div>
        )}

        {isRecording && (
          <div className="recording-status">
            <div className="recording-dot" />
            <span className="recording-time">{formatDuration(recordingDuration)}</span>
          </div>
        )}

        {/* Level meter */}
        <div className="level-meter">
          <div className="level-meter-bar">
            <div
              className="level-meter-fill"
              style={{ width: `${level * 100}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="vocal-recorder-controls">
          {!isRecording && !isCountingIn ? (
            <button
              className="btn btn--primary record-btn"
              onClick={handleStartRecording}
            >
              Record
            </button>
          ) : (
            <>
              <button
                className="btn btn--danger"
                onClick={handleStopRecording}
                disabled={isCountingIn}
              >
                Stop
              </button>
              <button
                className="btn"
                onClick={handleCancelRecording}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <p className="help-text">
        Recordings are synced to the current BPM and added to the Vocals track
      </p>
    </div>
  );
}
