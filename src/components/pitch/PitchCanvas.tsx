import { useEffect, useRef } from 'react';
import { useAudioStore } from '../../stores/audio-store';
import { NOTE_NAMES } from '../../audio/music-theory';

export function PitchCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pitchHistory = useAudioStore(s => s.pitchHistory);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      const w = rect.width;
      const h = rect.height;

      // Background
      ctx.fillStyle = '#1e2a4a';
      ctx.fillRect(0, 0, w, h);

      // Draw note grid lines
      const midiLow = 48;  // C3
      const midiHigh = 72; // C5
      const midiRange = midiHigh - midiLow;

      ctx.strokeStyle = '#2a3a5e';
      ctx.lineWidth = 0.5;
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = '#6a6a82';

      for (let midi = midiLow; midi <= midiHigh; midi++) {
        const y = h - ((midi - midiLow) / midiRange) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();

        if (midi % 12 === 0 || midi % 12 === 4 || midi % 12 === 7) {
          ctx.fillText(`${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`, 4, y - 2);
        }
      }

      // Draw pitch history
      const history = pitchHistory;
      if (history.length < 2) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const now = performance.now();
      const timeWindow = 5000; // 5 seconds visible

      // Draw detected pitch (gray)
      ctx.strokeStyle = 'rgba(160, 160, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let started = false;

      for (const point of history) {
        const age = now - point.time;
        if (age > timeWindow || point.midi <= 0) {
          started = false;
          continue;
        }

        const x = w - (age / timeWindow) * w;
        const y = h - ((point.midi - midiLow) / midiRange) * h;

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

      for (const point of history) {
        const age = now - point.time;
        if (age > timeWindow || point.correctedMidi <= 0) {
          started = false;
          continue;
        }

        const x = w - (age / timeWindow) * w;
        const y = h - ((point.correctedMidi - midiLow) / midiRange) * h;

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw target notes (green dots)
      ctx.fillStyle = '#4caf50';
      for (const point of history) {
        const age = now - point.time;
        if (age > timeWindow || point.targetMidi <= 0) continue;

        const x = w - (age / timeWindow) * w;
        const y = h - ((point.targetMidi - midiLow) / midiRange) * h;

        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [pitchHistory]);

  return (
    <div className="pitch-canvas">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
