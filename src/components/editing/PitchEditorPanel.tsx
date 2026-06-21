import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudioStore } from '../../stores/audio-store';
import { useTimelineStore, type TimelineClip } from '../../stores/timeline-store';
import { Knob } from '../controls/Knob';
import { KeySelector } from '../controls/KeySelector';
import { NOTE_NAMES } from '../../audio/music-theory';
import { detectPitchYIN } from '../../audio/pitch-detection';
import { PitchCorrector, type PitchCorrectionParams } from '../../audio/pitch-correction';

interface PitchPoint {
  time: number;        // Time in seconds
  frequency: number;   // Detected frequency
  midi: number;        // MIDI note number
  correctedMidi: number; // Corrected MIDI note
  clarity: number;     // Detection clarity
}

interface PitchEditorPanelProps {
  clipId: string | null;
  audioBuffer?: AudioBuffer;
  onClose?: () => void;
}

export function PitchEditorPanel({ clipId, audioBuffer, onClose }: PitchEditorPanelProps) {
  const { clips, updateClip } = useTimelineStore();
  const { key, scale, retuneSpeed, humanize, correctionAmount } = useAudioStore();

  const clip = clipId ? clips.find((c) => c.id === clipId) : null;

  const [pitchData, setPitchData] = useState<PitchPoint[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
  const [editMode, setEditMode] = useState<'select' | 'draw' | 'adjust'>('select');
  const [formantPreserve, setFormantPreserve] = useState(true);
  const [vibratoAmount, setVibratoAmount] = useState(0);
  const [noteSnapEnabled, setNoteSnapEnabled] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 600, height: 300 });
  const [viewRange, setViewRange] = useState({ minMidi: 48, maxMidi: 72 }); // C3 to C5

  // Analyze audio for pitch data
  const analyzeAudio = useCallback(async () => {
    if (!audioBuffer) return;

    setIsAnalyzing(true);
    setPitchData([]);
    setAnalysisProgress(0);

    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const frameSize = 2048;
    const hopSize = 512;
    const totalFrames = Math.floor((channelData.length - frameSize) / hopSize);

    const points: PitchPoint[] = [];
    const corrector = new PitchCorrector();
    const params: PitchCorrectionParams = {
      key,
      scale,
      retuneSpeed,
      humanize,
      amount: correctionAmount,
      enabled: true,
    };

    for (let i = 0; i < totalFrames; i++) {
      const start = i * hopSize;
      const frame = channelData.slice(start, start + frameSize);
      const time = start / sampleRate;

      const { frequency, clarity } = detectPitchYIN(frame, sampleRate);

      if (frequency > 0 && clarity > 0.5) {
        const midi = 12 * Math.log2(frequency / 440) + 69;
        const { correctedMidi } = corrector.correct(frequency, params, hopSize / sampleRate);

        points.push({
          time,
          frequency,
          midi,
          correctedMidi,
          clarity,
        });
      }

      if (i % 100 === 0) {
        setAnalysisProgress((i / totalFrames) * 100);
        // Allow UI to update
        await new Promise(r => setTimeout(r, 0));
      }
    }

    setPitchData(points);
    setIsAnalyzing(false);
    setAnalysisProgress(100);

    // Auto-adjust view range
    if (points.length > 0) {
      const midiValues = points.map(p => p.midi).filter(m => m > 0);
      if (midiValues.length > 0) {
        const minMidi = Math.floor(Math.min(...midiValues)) - 6;
        const maxMidi = Math.ceil(Math.max(...midiValues)) + 6;
        setViewRange({ minMidi, maxMidi });
      }
    }
  }, [audioBuffer, key, scale, retuneSpeed, humanize, correctionAmount]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasDimensions;
    const { minMidi, maxMidi } = viewRange;
    const midiRange = maxMidi - minMidi;

    // Clear canvas
    ctx.fillStyle = '#1e2a4a';
    ctx.fillRect(0, 0, width, height);

    // Draw note grid lines
    ctx.strokeStyle = '#2a3a5e';
    ctx.lineWidth = 0.5;
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#6a6a82';

    for (let midi = Math.ceil(minMidi); midi <= Math.floor(maxMidi); midi++) {
      const y = height - ((midi - minMidi) / midiRange) * height;

      // Highlight note lines based on type
      const noteInOctave = midi % 12;
      if (noteInOctave === 0) {
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)'; // C notes
        ctx.lineWidth = 1;
      } else if ([2, 4, 5, 7, 9, 11].includes(noteInOctave)) {
        ctx.strokeStyle = '#2a3a5e'; // White keys
        ctx.lineWidth = 0.5;
      } else {
        ctx.strokeStyle = '#232840'; // Black keys
        ctx.lineWidth = 0.5;
      }

      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Note labels
      if (noteInOctave === 0 || noteInOctave === 4 || noteInOctave === 7) {
        ctx.fillText(`${NOTE_NAMES[noteInOctave]}${Math.floor(midi / 12) - 1}`, 4, y + 3);
      }
    }

    // Get time range from audio buffer
    const duration = audioBuffer?.duration || 5;

    // Draw time grid
    ctx.strokeStyle = '#2a3a5e';
    ctx.lineWidth = 0.5;
    for (let t = 0; t <= duration; t += 0.5) {
      const x = 40 + (t / duration) * (width - 40);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      if (t % 1 === 0) {
        ctx.fillText(`${t.toFixed(0)}s`, x + 2, height - 4);
      }
    }

    // Draw pitch data
    if (pitchData.length > 0) {
      // Draw original pitch (gray)
      ctx.strokeStyle = 'rgba(160, 160, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let started = false;

      for (const point of pitchData) {
        const x = 40 + (point.time / duration) * (width - 40);
        const y = height - ((point.midi - minMidi) / midiRange) * height;

        if (y < 0 || y > height) {
          started = false;
          continue;
        }

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw corrected pitch (cyan)
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      started = false;

      for (const point of pitchData) {
        const x = 40 + (point.time / duration) * (width - 40);
        const y = height - ((point.correctedMidi - minMidi) / midiRange) * height;

        if (y < 0 || y > height) {
          started = false;
          continue;
        }

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw selected points
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      pitchData.forEach((point, index) => {
        if (selectedNotes.has(index)) {
          const x = 40 + (point.time / duration) * (width - 40);
          const y = height - ((point.correctedMidi - minMidi) / midiRange) * height;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw editing cursor based on mode
    if (editMode === 'draw') {
      canvas.style.cursor = 'crosshair';
    } else if (editMode === 'adjust') {
      canvas.style.cursor = 'ns-resize';
    } else {
      canvas.style.cursor = 'default';
    }

  }, [pitchData, canvasDimensions, viewRange, selectedNotes, editMode, audioBuffer]);

  // Handle canvas click for selection
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editMode !== 'select' || pitchData.length === 0 || !audioBuffer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { width, height } = canvasDimensions;
    const { minMidi, maxMidi } = viewRange;
    const duration = audioBuffer.duration;

    // Find nearest point
    let nearestIndex = -1;
    let nearestDist = Infinity;

    pitchData.forEach((point, index) => {
      const px = 40 + (point.time / duration) * (width - 40);
      const py = height - ((point.correctedMidi - minMidi) / (maxMidi - minMidi)) * height;
      const dist = Math.hypot(x - px, y - py);

      if (dist < nearestDist && dist < 20) {
        nearestDist = dist;
        nearestIndex = index;
      }
    });

    if (nearestIndex >= 0) {
      if (e.shiftKey) {
        // Add to selection
        const newSelection = new Set(selectedNotes);
        if (newSelection.has(nearestIndex)) {
          newSelection.delete(nearestIndex);
        } else {
          newSelection.add(nearestIndex);
        }
        setSelectedNotes(newSelection);
      } else {
        // Single selection
        setSelectedNotes(new Set([nearestIndex]));
      }
    } else {
      // Clear selection
      setSelectedNotes(new Set());
    }
  }, [editMode, pitchData, canvasDimensions, viewRange, audioBuffer, selectedNotes]);

  // Adjust selected notes
  const adjustSelectedNotes = useCallback((semitones: number) => {
    if (selectedNotes.size === 0) return;

    const newPitchData = pitchData.map((point, index) => {
      if (selectedNotes.has(index)) {
        return {
          ...point,
          correctedMidi: point.correctedMidi + semitones,
        };
      }
      return point;
    });

    setPitchData(newPitchData);
  }, [pitchData, selectedNotes]);

  // Snap selected notes to nearest scale note
  const snapToScale = useCallback(() => {
    if (selectedNotes.size === 0) return;

    const newPitchData = pitchData.map((point, index) => {
      if (selectedNotes.has(index)) {
        // Snap to nearest semitone
        return {
          ...point,
          correctedMidi: Math.round(point.correctedMidi),
        };
      }
      return point;
    });

    setPitchData(newPitchData);
  }, [pitchData, selectedNotes]);

  // Reset selected notes to original
  const resetSelected = useCallback(() => {
    if (selectedNotes.size === 0) return;

    const newPitchData = pitchData.map((point, index) => {
      if (selectedNotes.has(index)) {
        return {
          ...point,
          correctedMidi: point.midi,
        };
      }
      return point;
    });

    setPitchData(newPitchData);
  }, [pitchData, selectedNotes]);

  if (!clip || clip.type !== 'audio') {
    return (
      <div className="pitch-editor-panel empty">
        <p>Select an audio clip to edit its pitch</p>
      </div>
    );
  }

  return (
    <div className="pitch-editor-panel">
      <div className="panel-header">
        <h3>Pitch Editor</h3>
        {onClose && (
          <button className="btn btn--sm btn--icon" onClick={onClose}>
            x
          </button>
        )}
      </div>

      <div className="panel-content">
        {/* Correction Settings */}
        <div className="pitch-editor-settings">
          <KeySelector />

          <div className="settings-row">
            <Knob label="Retune" value={retuneSpeed} min={0} max={400} step={1} unit="ms" onChange={() => {}} />
            <Knob label="Amount" value={correctionAmount} min={0} max={100} step={1} unit="%" onChange={() => {}} color="var(--accent-green)" />
            <Knob label="Humanize" value={humanize} min={0} max={100} step={1} unit="%" onChange={() => {}} color="var(--accent-orange)" />
          </div>

          <div className="settings-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formantPreserve}
                onChange={(e) => setFormantPreserve(e.target.checked)}
              />
              Formant Preservation
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={noteSnapEnabled}
                onChange={(e) => setNoteSnapEnabled(e.target.checked)}
              />
              Note Snap
            </label>
          </div>

          <div className="settings-row">
            <label>Vibrato</label>
            <input
              type="range"
              min="0"
              max="100"
              value={vibratoAmount}
              onChange={(e) => setVibratoAmount(parseInt(e.target.value))}
            />
            <span>{vibratoAmount}%</span>
          </div>
        </div>

        {/* Analysis Controls */}
        <div className="pitch-editor-analysis">
          <button
            className="btn btn--primary"
            onClick={analyzeAudio}
            disabled={!audioBuffer || isAnalyzing}
          >
            {isAnalyzing ? `Analyzing... ${analysisProgress.toFixed(0)}%` : 'Analyze Pitch'}
          </button>

          {isAnalyzing && (
            <div className="progress-bar">
              <div className="progress-bar__fill" style={{ width: `${analysisProgress}%` }} />
            </div>
          )}
        </div>

        {/* Edit Tools */}
        <div className="pitch-editor-tools">
          <div className="tool-group">
            <button
              className={`tool-btn ${editMode === 'select' ? 'active' : ''}`}
              onClick={() => setEditMode('select')}
              title="Select"
            >
              S
            </button>
            <button
              className={`tool-btn ${editMode === 'draw' ? 'active' : ''}`}
              onClick={() => setEditMode('draw')}
              title="Draw"
            >
              D
            </button>
            <button
              className={`tool-btn ${editMode === 'adjust' ? 'active' : ''}`}
              onClick={() => setEditMode('adjust')}
              title="Adjust"
            >
              A
            </button>
          </div>

          <div className="tool-divider" />

          <div className="tool-group">
            <button
              className="tool-btn"
              onClick={() => adjustSelectedNotes(1)}
              disabled={selectedNotes.size === 0}
              title="Pitch Up (+1 semitone)"
            >
              +
            </button>
            <button
              className="tool-btn"
              onClick={() => adjustSelectedNotes(-1)}
              disabled={selectedNotes.size === 0}
              title="Pitch Down (-1 semitone)"
            >
              -
            </button>
            <button
              className="tool-btn"
              onClick={snapToScale}
              disabled={selectedNotes.size === 0}
              title="Snap to Scale"
            >
              Snap
            </button>
            <button
              className="tool-btn"
              onClick={resetSelected}
              disabled={selectedNotes.size === 0}
              title="Reset to Original"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Pitch Canvas */}
        <div className="pitch-editor-canvas">
          <canvas
            ref={canvasRef}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            onClick={handleCanvasClick}
          />
        </div>

        {/* Selection Info */}
        {selectedNotes.size > 0 && (
          <div className="pitch-editor-info">
            <span>{selectedNotes.size} note(s) selected</span>
          </div>
        )}
      </div>
    </div>
  );
}
