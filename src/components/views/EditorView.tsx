import { useState, useRef, useCallback } from 'react';
import { useProjectStore } from '../../stores/project-store';
import { useAudioStore } from '../../stores/audio-store';
import { decodeAudioFile } from '../../audio/file-decoder';
import { processAudioOffline } from '../../audio/offline-processor';
import { PitchCanvas } from '../pitch/PitchCanvas';

export function EditorView() {
  const importedFileName = useProjectStore(s => s.importedFileName);
  const importedBuffer = useProjectStore(s => s.importedBuffer);
  const processedBuffer = useProjectStore(s => s.processedBuffer);
  const processingProgress = useProjectStore(s => s.processingProgress);
  const setImportedFile = useProjectStore(s => s.setImportedFile);
  const setProcessedBuffer = useProjectStore(s => s.setProcessedBuffer);
  const setProcessingProgress = useProjectStore(s => s.setProcessingProgress);
  const clearImport = useProjectStore(s => s.clearImport);

  const key = useAudioStore(s => s.key);
  const scale = useAudioStore(s => s.scale);
  const retuneSpeed = useAudioStore(s => s.retuneSpeed);
  const humanize = useAudioStore(s => s.humanize);
  const correctionAmount = useAudioStore(s => s.correctionAmount);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  };

  const handleFile = useCallback(async (file: File) => {
    try {
      const ctx = getAudioContext();
      const buffer = await decodeAudioFile(file, ctx);
      setImportedFile(file.name, buffer);
      setProcessedBuffer(null);
      setProcessingProgress(0);
    } catch (err) {
      console.error('Failed to decode audio:', err);
      alert('Failed to decode audio file.');
    }
  }, [setImportedFile, setProcessedBuffer, setProcessingProgress]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleProcess = useCallback(async () => {
    if (!importedBuffer) return;

    setIsProcessing(true);
    try {
      const result = await processAudioOffline(
        importedBuffer,
        { key, scale, retuneSpeed, humanize, amount: correctionAmount, enabled: true },
        (progress) => setProcessingProgress(progress.percent)
      );
      setProcessedBuffer(result.outputBuffer);
    } catch (err) {
      console.error('Processing failed:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [importedBuffer, key, scale, retuneSpeed, humanize, correctionAmount, setProcessedBuffer, setProcessingProgress]);

  const handlePreview = useCallback(() => {
    const buffer = processedBuffer || importedBuffer;
    if (!buffer) return;

    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  }, [processedBuffer, importedBuffer]);

  return (
    <div className="editor-view">
      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">Audio Editor</span>
          {importedFileName && <span className="text-sm text-secondary">{importedFileName}</span>}
        </div>

        {!importedBuffer ? (
          <div
            className={`file-drop-zone ${isDragging ? 'file-drop-zone--active' : ''}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="file-drop-zone__icon">&#127925;</div>
            <div className="file-drop-zone__text">Drop an audio file here or click to browse</div>
            <div className="file-drop-zone__hint">Supports WAV, MP3, OGG, FLAC</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="waveform-container">
              <div className="flex items-center justify-center" style={{ height: '100%' }}>
                <span className="text-muted">
                  {importedFileName} ({importedBuffer.duration.toFixed(1)}s, {importedBuffer.sampleRate}Hz)
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="btn btn--primary" onClick={handleProcess} disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Apply Correction'}
              </button>
              <button className="btn" onClick={handlePreview}>
                Preview {processedBuffer ? '(Processed)' : '(Original)'}
              </button>
              <button className="btn" onClick={clearImport}>Clear</button>
            </div>

            {isProcessing && (
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${processingProgress}%` }} />
              </div>
            )}

            {processedBuffer && (
              <div className="text-sm" style={{ color: 'var(--accent-green)' }}>
                Processing complete. Use Export tab to save.
              </div>
            )}
          </div>
        )}
      </div>

      <PitchCanvas />
    </div>
  );
}
