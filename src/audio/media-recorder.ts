// Simple MediaRecorder-based audio recorder for microphone input

export interface RecordingResult {
  blob: Blob;
  buffer: AudioBuffer;
  duration: number;
}

export class MicrophoneRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private isRecording = false;
  private startTime = 0;

  async init(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      this.audioContext = new AudioContext();
      return true;
    } catch (err) {
      console.error('Failed to get microphone access:', err);
      return false;
    }
  }

  async start(): Promise<boolean> {
    if (!this.stream) {
      const success = await this.init();
      if (!success) return false;
    }

    if (!this.stream) return false;

    this.chunks = [];
    this.isRecording = true;
    this.startTime = Date.now();

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: this.getSupportedMimeType(),
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
    return true;
  }

  async stop(): Promise<RecordingResult | null> {
    if (!this.mediaRecorder || !this.isRecording) {
      return null;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.chunks, { type: this.getSupportedMimeType() });
        const duration = (Date.now() - this.startTime) / 1000;

        // Convert blob to AudioBuffer
        const arrayBuffer = await blob.arrayBuffer();

        if (!this.audioContext) {
          this.audioContext = new AudioContext();
        }

        try {
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          resolve({ blob, buffer: audioBuffer, duration });
        } catch (err) {
          console.error('Failed to decode recorded audio:', err);
          resolve(null);
        }

        this.isRecording = false;
        this.chunks = [];
      };

      this.mediaRecorder.stop();
    });
  }

  isActive(): boolean {
    return this.isRecording;
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }

  dispose(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isRecording = false;
    this.chunks = [];
  }
}

// Singleton instance
export const microphoneRecorder = new MicrophoneRecorder();
