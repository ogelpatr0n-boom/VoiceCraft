import { useState, useCallback, useRef } from 'react';
import { decodeAudioFile } from '../../audio/buffer-store';
import { useTimelineStore } from '../../stores/timeline-store';
import { usePatternStore } from '../../stores/pattern-store';

interface AudioDropZoneProps {
  className?: string;
  compact?: boolean;
}

export function AudioDropZone({ className = '', compact = false }: AudioDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastImported, setLastImported] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTrack = useTimelineStore(s => s.addTrack);
  const addClip  = useTimelineStore(s => s.addClip);
  const tracks   = useTimelineStore(s => s.tracks);
  const bpm      = usePatternStore(s => s.globalBpm);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('audio/')) continue;
        const { buffer, id } = await decodeAudioFile(file);
        const durationBeats = (buffer.duration * bpm) / 60;

        // Find or create an audio track
        let trackId = tracks.find(t => t.type === 'audio')?.id;
        if (!trackId) trackId = addTrack('audio', 'Audio');

        addClip({
          trackId,
          type: 'audio',
          name: file.name.replace(/\.[^.]+$/, ''),
          startBeat: 0,
          duration: Math.ceil(durationBeats / 4) * 4,
          color: '#ff6b35',
          audioBufferId: id,
        });

        setLastImported(file.name);
      }
    } catch (e) {
      alert('Could not decode audio file. Make sure it\'s a valid WAV or MP3.');
    } finally {
      setIsLoading(false);
    }
  }, [tracks, addTrack, addClip, bpm]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  if (compact) {
    return (
      <div className={`audio-drop-zone audio-drop-zone--compact ${isDragging ? 'audio-drop-zone--over' : ''} ${className}`}
        onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="audio/*" multiple hidden
          onChange={e => handleFiles(e.target.files)} />
        {isLoading ? 'Loading…' : lastImported ? `✓ ${lastImported}` : '+ Import Audio'}
      </div>
    );
  }

  return (
    <div
      className={`audio-drop-zone ${isDragging ? 'audio-drop-zone--over' : ''} ${className}`}
      onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
    >
      <input ref={inputRef} type="file" accept="audio/*" multiple hidden
        onChange={e => handleFiles(e.target.files)} />
      <div className="audio-drop-zone__icon">🎵</div>
      <div className="audio-drop-zone__text">
        {isLoading ? 'Decoding audio…' : 'Drop WAV or MP3 here'}
      </div>
      <button className="btn btn--sm" onClick={() => inputRef.current?.click()}>
        Browse Files
      </button>
      {lastImported && <div className="text-xs text-muted" style={{ marginTop: 4 }}>✓ {lastImported}</div>}
    </div>
  );
}
