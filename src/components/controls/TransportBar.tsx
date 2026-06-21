import { useState, useEffect, useCallback, useRef } from 'react';
import { useProjectStore } from '../../stores/project-store';
import { useTimelineStore } from '../../stores/timeline-store';
import { BPMControl } from './BPMControl';
import { TimeSignatureControl } from './TimeSignature';
import { MetronomeToggle } from './MetronomeToggle';
import { transport } from '../../audio/timing/transport';
import { metronome } from '../../audio/timing/metronome';
import { microphoneRecorder } from '../../audio/media-recorder';
import type { TimeSignature } from '../../audio/timing/time-utils';
import { beatsToBarsBeatsTicks, formatBarsBeatsTicks } from '../../audio/timing/time-utils';

export function TransportBar() {
  const isPlaying = useProjectStore(s => s.isPlaying);
  const isRecording = useProjectStore(s => s.isRecording);
  const isLooping = useProjectStore(s => s.isLooping);
  const currentTime = useProjectStore(s => s.currentTime);
  const bpm = useProjectStore(s => s.bpm);
  const setIsPlaying = useProjectStore(s => s.setIsPlaying);
  const setIsRecording = useProjectStore(s => s.setIsRecording);
  const setIsLooping = useProjectStore(s => s.setIsLooping);
  const setCurrentTime = useProjectStore(s => s.setCurrentTime);
  const setBpm = useProjectStore(s => s.setBpm);
  const setImportedFile = useProjectStore(s => s.setImportedFile);

  const tracks = useTimelineStore(s => s.tracks);
  const addTrack = useTimelineStore(s => s.addTrack);
  const addClip = useTimelineStore(s => s.addClip);

  const [timeSignature, setTimeSignature] = useState<TimeSignature>({ numerator: 4, denominator: 4 });
  const recordStartTimeRef = useRef(0);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [metronomeVolume, setMetronomeVolume] = useState(-6);

  // Sync transport with store state
  useEffect(() => {
    transport.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    transport.setTimeSignature(timeSignature);
  }, [timeSignature]);

  useEffect(() => {
    transport.setLoopEnabled(isLooping);
  }, [isLooping]);

  useEffect(() => {
    metronome.setEnabled(metronomeEnabled && isPlaying);
  }, [metronomeEnabled, isPlaying]);

  useEffect(() => {
    metronome.setVolume(metronomeVolume);
  }, [metronomeVolume]);

  // Update position during playback
  useEffect(() => {
    let animationId: number;

    const updatePosition = () => {
      if (isPlaying) {
        const seconds = transport.getPositionSeconds();
        setCurrentTime(seconds);
        animationId = requestAnimationFrame(updatePosition);
      }
    };

    if (isPlaying) {
      animationId = requestAnimationFrame(updatePosition);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isPlaying, setCurrentTime]);

  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      transport.pause();
      setIsPlaying(false);
    } else {
      await transport.play();
      setIsPlaying(true);
    }
  }, [isPlaying, setIsPlaying]);

  const handleStop = useCallback(async () => {
    // Stop recording if active
    if (isRecording) {
      const result = await microphoneRecorder.stop();
      if (result) {
        // Create a new audio track if none exists
        let trackId = tracks.find(t => t.type === 'audio')?.id;
        if (!trackId) {
          trackId = addTrack('audio', 'Recorded Audio');
        }

        // Add the recorded clip to the timeline
        const currentBeat = (recordStartTimeRef.current * bpm) / 60;
        const durationBeats = (result.duration * bpm) / 60;

        addClip({
          trackId,
          type: 'audio',
          name: `Recording ${new Date().toLocaleTimeString()}`,
          startBeat: currentBeat,
          duration: durationBeats,
          color: '#ff6b35',
        });

        // Also store in project for export
        setImportedFile('Recording', result.buffer);
      }
      setIsRecording(false);
    }

    transport.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  }, [isRecording, setIsPlaying, setCurrentTime, tracks, addTrack, addClip, bpm, setImportedFile, setIsRecording]);

  const handleRecord = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      const result = await microphoneRecorder.stop();
      if (result) {
        // Create a new audio track if none exists
        let trackId = tracks.find(t => t.type === 'audio')?.id;
        if (!trackId) {
          trackId = addTrack('audio', 'Recorded Audio');
        }

        // Add the recorded clip to the timeline
        const currentBeat = (recordStartTimeRef.current * bpm) / 60;
        const durationBeats = (result.duration * bpm) / 60;

        addClip({
          trackId,
          type: 'audio',
          name: `Recording ${new Date().toLocaleTimeString()}`,
          startBeat: currentBeat,
          duration: durationBeats,
          color: '#ff6b35',
        });

        setImportedFile('Recording', result.buffer);
      }
      setIsRecording(false);
    } else {
      // Start recording
      const success = await microphoneRecorder.start();
      if (success) {
        recordStartTimeRef.current = currentTime;
        setIsRecording(true);
        // Also start playback if not already playing
        if (!isPlaying) {
          await transport.play();
          setIsPlaying(true);
        }
      } else {
        alert('Could not access microphone. Please check permissions.');
      }
    }
  }, [isRecording, isPlaying, currentTime, tracks, addTrack, addClip, bpm, setImportedFile, setIsRecording, setIsPlaying]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const formatBeats = (seconds: number) => {
    const beats = (seconds * bpm) / 60;
    const bbt = beatsToBarsBeatsTicks(beats, timeSignature);
    return formatBarsBeatsTicks(bbt);
  };

  return (
    <div className="transport">
      <div className="transport__left">
        <BPMControl
          value={bpm}
          onChange={setBpm}
        />
        <TimeSignatureControl
          value={timeSignature}
          onChange={setTimeSignature}
        />
        <MetronomeToggle
          enabled={metronomeEnabled}
          volume={metronomeVolume}
          onToggle={setMetronomeEnabled}
          onVolumeChange={setMetronomeVolume}
        />
      </div>

      <div className="transport__center">
        <button
          className={`transport__btn ${isRecording ? 'transport__btn--record transport__btn--active' : 'transport__btn--record'}`}
          onClick={handleRecord}
          title={isRecording ? 'Stop Recording' : 'Record'}
        >
          &#9679;
        </button>
        <button
          className="transport__btn"
          onClick={handleStop}
          title="Stop"
        >
          &#9632;
        </button>
        <button
          className={`transport__btn transport__btn--play ${isPlaying ? 'transport__btn--active' : ''}`}
          onClick={handlePlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '\u2016' : '\u25B6'}
        </button>
        <button
          className={`transport__btn ${isLooping ? 'transport__btn--active' : ''}`}
          onClick={() => setIsLooping(!isLooping)}
          title="Loop"
        >
          &#8634;
        </button>
      </div>

      <div className="transport__right">
        <div className="transport__time-display">
          <span className="transport__time">{formatTime(currentTime)}</span>
          <span className="transport__beats">{formatBeats(currentTime)}</span>
        </div>
      </div>
    </div>
  );
}
