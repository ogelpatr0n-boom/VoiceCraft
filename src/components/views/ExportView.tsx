import { useState, useCallback, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { useProjectStore } from '../../stores/project-store';
import { usePatternStore } from '../../stores/pattern-store';
import { useSessionStore } from '../../stores/session-store';
import { encodeWAV, encodeMP3 } from '../../audio/file-encoder';
import { audioBufferToFloat32 } from '../../audio/file-decoder';
import { videoExportEngine } from '../../audio/video-export-engine';
import { exportProjectFile } from '../../utils/persistence';

type Tab = 'audio' | 'video' | 'project';
type AudioFormat = 'wav' | 'mp3';

export function ExportView() {
  const [tab, setTab] = useState<Tab>('audio');

  return (
    <div className="export-view">
      <div className="export-view__tabs">
        {(['audio', 'video', 'project'] as Tab[]).map(t => (
          <button
            key={t}
            className={`export-view__tab ${tab === t ? 'export-view__tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'audio' ? '🔊 Audio' : t === 'video' ? '🎬 Video' : '💾 Project'}
          </button>
        ))}
      </div>

      <div className="export-view__content">
        {tab === 'audio' && <AudioExportPanel />}
        {tab === 'video' && <VideoExportPanel />}
        {tab === 'project' && <ProjectExportPanel />}
      </div>
    </div>
  );
}

// ── Audio Export ────────────────────────────────────────────────────────────
function AudioExportPanel() {
  const importedBuffer = useProjectStore(s => s.importedBuffer);
  const processedBuffer = useProjectStore(s => s.processedBuffer);
  const importedFileName = useProjectStore(s => s.importedFileName);
  const projectName = useSessionStore(s => s.projectName);

  const [format, setFormat] = useState<AudioFormat>('wav');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const buffer = processedBuffer || importedBuffer;

  const handleExport = useCallback(async () => {
    if (!buffer) return;
    setIsExporting(true);
    setProgress(0);
    try {
      const samples = audioBufferToFloat32(buffer);
      let blob: Blob;
      if (format === 'wav') {
        setProgress(50);
        blob = encodeWAV(samples, buffer.sampleRate);
      } else {
        setProgress(20);
        blob = await encodeMP3(samples, buffer.sampleRate);
      }
      setProgress(100);
      const baseName = importedFileName?.replace(/\.[^.]+$/, '') || projectName || 'voicecraft';
      download(blob, `${baseName}.${format}`);
    } catch {
      alert('Export failed.');
    } finally {
      setIsExporting(false);
    }
  }, [buffer, format, importedFileName, projectName]);

  return (
    <div className="export-panel">
      <h3 className="export-panel__title">Export Audio</h3>
      {!buffer ? (
        <div className="export-panel__empty">
          No audio to export. Record in the Live view or import an audio file.
        </div>
      ) : (
        <>
          <div className="export-panel__info">
            {buffer.duration.toFixed(1)}s · {buffer.sampleRate}Hz · {buffer.numberOfChannels}ch
            {processedBuffer && <span className="export-panel__badge">Processed</span>}
          </div>
          <div className="export-format-grid">
            {(['wav', 'mp3'] as AudioFormat[]).map(f => (
              <div
                key={f}
                className={`export-format-card ${format === f ? 'export-format-card--selected' : ''}`}
                onClick={() => setFormat(f)}
              >
                <div className="export-format-card__name">{f.toUpperCase()}</div>
                <div className="export-format-card__desc">
                  {f === 'wav' ? 'Lossless · Best quality' : 'Compressed · Smaller file'}
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn--primary export-panel__go" onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting…' : `Download ${format.toUpperCase()}`}
          </button>
          {isExporting && <div className="export-panel__progress"><div style={{ width: `${progress}%` }} /></div>}
        </>
      )}
    </div>
  );
}

// ── Video Export ─────────────────────────────────────────────────────────────
function VideoExportPanel() {
  const projectName = useSessionStore(s => s.projectName);
  const bpm = usePatternStore(s => s.globalBpm);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [shareSupported] = useState(() => !!navigator.share);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const startRecording = useCallback(async () => {
    await Tone.start();
    setBlob(null);
    setElapsed(0);
    await videoExportEngine.start({
      title: projectName || 'VoiceCraft',
      bpm,
      key: 'C',
    });
    setIsRecording(true);
    timerRef.current = setInterval(() => setElapsed(videoExportEngine.elapsed), 250);

    // Start transport
    if (Tone.getTransport().state !== 'started') {
      Tone.getTransport().start();
    }
  }, [projectName, bpm]);

  const stopRecording = useCallback(async () => {
    clearInterval(timerRef.current);
    Tone.getTransport().stop();
    const result = await videoExportEngine.stop();
    setBlob(result);
    setIsRecording(false);
  }, []);

  const handleDownload = () => {
    if (!blob) return;
    download(blob, `${projectName || 'voicecraft'}-video.webm`);
  };

  const handleShare = async () => {
    if (!blob || !navigator.share) return;
    try {
      const file = new File([blob], `${projectName || 'voicecraft'}.webm`, { type: blob.type });
      await navigator.share({ title: projectName || 'VoiceCraft', files: [file] });
    } catch {
      handleDownload();
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  };

  return (
    <div className="export-panel">
      <h3 className="export-panel__title">Video Export</h3>
      <p className="export-panel__desc">
        Records your project playing with an animated waveform visualization.
        Press Start, let it play, then Stop to get the video.
      </p>

      <div className="video-export__preview-info">
        <div className="video-export__spec">1280×720 · 30fps · WebM</div>
        <div className="video-export__spec">{projectName || 'VoiceCraft'} · {bpm} BPM</div>
      </div>

      <div className="video-export__controls">
        {!isRecording ? (
          <button className="btn btn--primary video-export__btn" onClick={startRecording}>
            ● Start Recording
          </button>
        ) : (
          <button className="btn video-export__btn video-export__btn--stop" onClick={stopRecording}>
            ■ Stop Recording
          </button>
        )}

        {isRecording && (
          <div className="video-export__timer">
            <span className="video-export__rec-dot" /> {formatTime(elapsed)}
          </div>
        )}
      </div>

      {blob && (
        <div className="video-export__result">
          <div className="video-export__result-info">
            Recording complete · {(blob.size / 1_048_576).toFixed(1)} MB
          </div>
          <div className="video-export__result-actions">
            <button className="btn btn--primary" onClick={handleDownload}>
              ⬇ Download Video
            </button>
            {shareSupported && (
              <button className="btn" onClick={handleShare}>
                ↗ Share
              </button>
            )}
          </div>
          <video
            className="video-export__preview"
            src={URL.createObjectURL(blob)}
            controls
            style={{ width: '100%', maxWidth: 480, borderRadius: 8, marginTop: 12 }}
          />
        </div>
      )}

      <div className="video-export__tips">
        <div className="export-panel__tip">Play your arrangement before pressing Stop to get the full song.</div>
        <div className="export-panel__tip">Video exports as WebM — supported by all modern browsers and social platforms.</div>
        {shareSupported && <div className="export-panel__tip">Tap Share to send directly to Instagram, TikTok, Messages, etc.</div>}
      </div>
    </div>
  );
}

// ── Project Export ───────────────────────────────────────────────────────────
function ProjectExportPanel() {
  const projectName = useSessionStore(s => s.projectName);

  const name = projectName || 'voicecraft';
  const handleSave = () => exportProjectFile(name);

  const handleShare = async () => {
    const blob = await buildProjectBlob(name);
    if (!blob) return;
    if (navigator.share) {
      const file = new File([blob], `${name}.voicecraft`, { type: 'application/json' });
      try {
        await navigator.share({ title: name, files: [file] });
        return;
      } catch { /* fall through */ }
    }
    download(blob, `${name}.voicecraft`);
  };

  return (
    <div className="export-panel">
      <h3 className="export-panel__title">Project File</h3>
      <p className="export-panel__desc">
        Save your full project — all tracks, patterns, clips, instruments, and settings — as a <code>.voicecraft</code> file.
        Open it again anytime from the header's Load button.
      </p>
      <div className="export-panel__actions">
        <button className="btn btn--primary export-panel__go" onClick={handleSave}>
          💾 Download .voicecraft
        </button>
        {!!navigator.share && (
          <button className="btn export-panel__go" onClick={handleShare}>
            ↗ Share Project File
          </button>
        )}
      </div>
      <div className="export-panel__tip" style={{ marginTop: 16 }}>
        Send the .voicecraft file to a collaborator or back yourself up to cloud storage.
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function buildProjectBlob(name: string): Promise<Blob | null> {
  try {
    const { serializeProject } = await import('../../utils/persistence');
    const data = serializeProject(name);
    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  } catch { return null; }
}
