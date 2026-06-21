// Records canvas animation + live audio output → WebM video blob.
// Usage: call start() while music plays, stop() to get the blob.
import * as Tone from 'tone';

export interface VideoExportOptions {
  width?: number;
  height?: number;
  fps?: number;
  title?: string;
  bpm?: number;
  key?: string;
  durationMs?: number; // auto-stop after this many ms (0 = manual stop)
}

export class VideoExportEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private animFrame = 0;
  private analyser: AnalyserNode | null = null;
  private opts: Required<VideoExportOptions> = {
    width: 1280, height: 720, fps: 30, title: 'VoiceCraft', bpm: 120, key: 'C', durationMs: 0,
  };
  private startTime = 0;

  private pickMimeType(): string {
    const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return types.find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';
  }

  async start(options: VideoExportOptions = {}): Promise<void> {
    this.opts = { ...this.opts, ...options };
    this.chunks = [];

    // Build off-screen canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.opts.width;
    this.canvas.height = this.opts.height;
    this.ctx2d = this.canvas.getContext('2d')!;

    // Attach analyser to Tone.js destination
    const audioCtx = Tone.getContext().rawContext as AudioContext;
    this.analyser = audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    Tone.getDestination().connect(this.analyser as unknown as Tone.ToneAudioNode);

    // Create audio stream from destination
    const audioDest = audioCtx.createMediaStreamDestination();
    Tone.getDestination().connect(audioDest as unknown as Tone.ToneAudioNode);

    // Combine canvas video + audio tracks
    const videoStream = (this.canvas as HTMLCanvasElement & { captureStream(fps: number): MediaStream }).captureStream(this.opts.fps);
    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks(),
    ]);

    this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType: this.pickMimeType() });
    this.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) this.chunks.push(e.data); };

    this.startTime = Date.now();
    this.mediaRecorder.start(100); // collect chunks every 100ms
    this.drawFrame();

    // Auto-stop if duration specified
    if (this.opts.durationMs > 0) {
      setTimeout(() => this.stop(), this.opts.durationMs + 500);
    }
  }

  private drawFrame(): void {
    const c = this.ctx2d!;
    const w = this.opts.width;
    const h = this.opts.height;
    const elapsed = Date.now() - this.startTime;

    // Background gradient
    const bg = c.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0a0e1a');
    bg.addColorStop(1, '#141b2d');
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);

    // Get waveform data
    const bufLen = this.analyser!.frequencyBinCount;
    const data = new Float32Array(bufLen);
    this.analyser!.getFloatTimeDomainData(data);

    // Draw waveform glow
    const waveY = h * 0.55;
    const waveH = h * 0.3;

    for (let pass = 2; pass >= 0; pass--) {
      c.beginPath();
      const grad = c.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, `rgba(0,212,255,${0.2 + pass * 0.25})`);
      grad.addColorStop(0.5, `rgba(124,58,237,${0.2 + pass * 0.25})`);
      grad.addColorStop(1, `rgba(0,212,255,${0.2 + pass * 0.25})`);
      c.strokeStyle = grad;
      c.lineWidth = pass === 0 ? 2 : pass * 4;
      c.shadowBlur = pass * 8;
      c.shadowColor = '#00d4ff';

      for (let i = 0; i < bufLen; i++) {
        const x = (i / bufLen) * w;
        const y = waveY + data[i] * waveH;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
    }
    c.shadowBlur = 0;

    // Draw frequency bars at bottom
    const freqData = new Uint8Array(bufLen);
    this.analyser!.getByteFrequencyData(freqData);
    const barCount = 64;
    const barW = w / barCount;
    for (let i = 0; i < barCount; i++) {
      const barH = (freqData[i * 4] / 255) * h * 0.15;
      const hue = 180 + i * 2;
      c.fillStyle = `hsla(${hue},80%,60%,0.6)`;
      c.fillRect(i * barW, h - barH, barW - 1, barH);
    }

    // BPM pulse circle
    const bpm = this.opts.bpm;
    const beatMs = (60000 / bpm);
    const beatPhase = (elapsed % beatMs) / beatMs;
    const pulseR = 18 + (1 - beatPhase) * 12;
    const pulseAlpha = beatPhase < 0.3 ? 1 - beatPhase / 0.3 : 0;
    c.beginPath();
    c.arc(w - 60, 50, pulseR, 0, Math.PI * 2);
    c.fillStyle = `rgba(0,212,255,${pulseAlpha * 0.6})`;
    c.fill();
    c.beginPath();
    c.arc(w - 60, 50, 10, 0, Math.PI * 2);
    c.fillStyle = '#00d4ff';
    c.fill();

    // Title
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.font = `bold ${Math.round(w * 0.045)}px system-ui, sans-serif`;
    c.textAlign = 'left';
    c.fillText(this.opts.title, 48, 72);

    // BPM + Key
    c.fillStyle = 'rgba(0,212,255,0.8)';
    c.font = `${Math.round(w * 0.022)}px system-ui, sans-serif`;
    c.fillText(`${this.opts.bpm} BPM · Key of ${this.opts.key}`, 48, 110);

    // Timer
    const secs = Math.floor(elapsed / 1000);
    const mins = Math.floor(secs / 60);
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.font = `${Math.round(w * 0.018)}px monospace`;
    c.textAlign = 'right';
    c.fillText(`${String(mins).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`, w - 90, 72);

    this.animFrame = requestAnimationFrame(() => this.drawFrame());
  }

  stop(): Promise<Blob> {
    return new Promise(resolve => {
      cancelAnimationFrame(this.animFrame);
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(new Blob(this.chunks, { type: 'video/webm' }));
        return;
      }
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder!.mimeType });
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  get elapsed(): number {
    return this.startTime ? Date.now() - this.startTime : 0;
  }
}

export const videoExportEngine = new VideoExportEngine();
