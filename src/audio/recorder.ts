export class AudioRecorder {
  private ctx: AudioContext;
  private recorderNode: AudioWorkletNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Float32Array[] = [];
  private isRecording = false;
  private resolveStop: ((buffer: Float32Array) => void) | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  async init(): Promise<void> {
    try {
      this.recorderNode = new AudioWorkletNode(this.ctx, 'recorder-processor');
      this.recorderNode.port.onmessage = (e) => {
        if (e.data.type === 'data') {
          this.chunks = e.data.buffers;
          this.finalize();
        }
      };
    } catch {
      console.warn('Recorder worklet unavailable, using ScriptProcessor fallback');
    }
  }

  connectInput(source: AudioNode): void {
    if (this.recorderNode) {
      source.connect(this.recorderNode);
    }
  }

  start(): void {
    this.isRecording = true;
    this.chunks = [];
    if (this.recorderNode) {
      this.recorderNode.port.postMessage({ type: 'start' });
    }
  }

  stop(): Promise<Float32Array> {
    return new Promise((resolve) => {
      this.resolveStop = resolve;
      this.isRecording = false;
      if (this.recorderNode) {
        this.recorderNode.port.postMessage({ type: 'stop' });
      } else {
        this.finalize();
      }
    });
  }

  private finalize(): void {
    // Merge all chunks into single buffer
    const totalLength = this.chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.resolveStop?.(merged);
    this.resolveStop = null;
    this.chunks = [];
  }

  getNode(): AudioWorkletNode | null {
    return this.recorderNode;
  }
}
