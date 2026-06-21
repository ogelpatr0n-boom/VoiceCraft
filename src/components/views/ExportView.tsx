import { useState, useCallback } from 'react';
import { useProjectStore } from '../../stores/project-store';
import { encodeWAV, encodeMP3 } from '../../audio/file-encoder';
import { audioBufferToFloat32 } from '../../audio/file-decoder';

type ExportFormat = 'wav' | 'mp3';

export function ExportView() {
  const importedBuffer = useProjectStore(s => s.importedBuffer);
  const processedBuffer = useProjectStore(s => s.processedBuffer);
  const importedFileName = useProjectStore(s => s.importedFileName);

  const [format, setFormat] = useState<ExportFormat>('wav');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const buffer = processedBuffer || importedBuffer;
  const hasBuffer = buffer !== null;

  const handleExport = useCallback(async () => {
    if (!buffer) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      const samples = audioBufferToFloat32(buffer);
      let blob: Blob;

      if (format === 'wav') {
        setExportProgress(50);
        blob = encodeWAV(samples, buffer.sampleRate);
      } else {
        setExportProgress(20);
        blob = await encodeMP3(samples, buffer.sampleRate);
      }

      setExportProgress(100);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const baseName = importedFileName?.replace(/\.[^.]+$/, '') || 'voicecraft-output';
      a.href = url;
      a.download = `${baseName}-corrected.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. See console for details.');
    } finally {
      setIsExporting(false);
    }
  }, [buffer, format, importedFileName]);

  return (
    <div className="flex flex-col gap-4">
      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">Export Audio</span>
        </div>

        {!hasBuffer ? (
          <div className="text-center p-4">
            <div className="text-muted text-lg">No audio to export</div>
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>
              Import and process an audio file in the Editor, or record in the Mixer.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-secondary">
              Source: {importedFileName || 'Recording'} |
              Duration: {buffer.duration.toFixed(1)}s |
              Sample Rate: {buffer.sampleRate}Hz |
              {processedBuffer ? ' (Corrected)' : ' (Original)'}
            </div>

            <div className="export-options">
              <div
                className={`export-card ${format === 'wav' ? 'export-card--selected' : ''}`}
                onClick={() => setFormat('wav')}
              >
                <div className="font-bold">WAV</div>
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                  Uncompressed, lossless quality. Larger file size.
                  Best for further editing or high-quality archival.
                </div>
              </div>

              <div
                className={`export-card ${format === 'mp3' ? 'export-card--selected' : ''}`}
                onClick={() => setFormat('mp3')}
              >
                <div className="font-bold">MP3</div>
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                  Compressed, 128kbps. Smaller file size.
                  Best for sharing and streaming.
                </div>
              </div>
            </div>

            <button
              className="btn btn--primary"
              onClick={handleExport}
              disabled={isExporting}
              style={{ alignSelf: 'flex-start', padding: '10px 32px' }}
            >
              {isExporting ? 'Exporting...' : `Export as ${format.toUpperCase()}`}
            </button>

            {isExporting && (
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${exportProgress}%` }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
