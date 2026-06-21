import * as Tone from 'tone';

export interface RecordingOptions {
  countIn?: boolean;
  countInBars?: number;
  bpm?: number;
}

export interface RecordingResult {
  audioBuffer: AudioBuffer;
  duration: number;
  durationBeats: number;
}

class MicrophoneRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording = false;
  private onDataCallback: ((result: RecordingResult) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private onLevelCallback: ((level: number) => void) | null = null;
  private analyser: AnalyserNode | null = null;
  private levelCheckInterval: number | null = null;

  async requestPermission(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  hasPermission(): boolean {
    return this.stream !== null;
  }

  async startRecording(options: RecordingOptions = {}): Promise<void> {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    if (!this.stream) {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error('Microphone permission not granted');
      }
    }

    // Handle count-in if requested
    if (options.countIn && options.countInBars && options.bpm) {
      await this.playCountIn(options.countInBars, options.bpm);
    }

    this.audioChunks = [];
    this.isRecording = true;

    // Set up level monitoring
    const audioContext = Tone.getContext().rawContext as AudioContext | null;
    if (audioContext && this.stream && 'createMediaStreamSource' in audioContext) {
      const source = audioContext.createMediaStreamSource(this.stream);
      this.analyser = audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.levelCheckInterval = window.setInterval(() => {
        if (this.analyser) {
          this.analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const level = average / 255;
          this.onLevelCallback?.(level);
        }
      }, 50);
    }

    // Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(this.stream!, {
      mimeType: this.getSupportedMimeType(),
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = async () => {
      try {
        const result = await this.processRecording(options.bpm || 120);
        this.onDataCallback?.(result);
      } catch (error) {
        this.onErrorCallback?.(error as Error);
      }
    };

    this.mediaRecorder.onerror = (event: Event) => {
      const errorEvent = event as ErrorEvent;
      this.onErrorCallback?.(new Error(errorEvent.message || 'Recording error'));
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
  }

  stopRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) {
      return;
    }

    if (this.levelCheckInterval) {
      clearInterval(this.levelCheckInterval);
      this.levelCheckInterval = null;
    }

    this.isRecording = false;
    this.mediaRecorder.stop();
  }

  cancelRecording(): void {
    if (this.levelCheckInterval) {
      clearInterval(this.levelCheckInterval);
      this.levelCheckInterval = null;
    }

    this.isRecording = false;
    this.audioChunks = [];

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  setOnData(callback: (result: RecordingResult) => void): void {
    this.onDataCallback = callback;
  }

  setOnError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  setOnLevel(callback: (level: number) => void): void {
    this.onLevelCallback = callback;
  }

  dispose(): void {
    this.cancelRecording();
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
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

  private async playCountIn(bars: number, bpm: number): Promise<void> {
    const synth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: {
        attack: 0.001,
        decay: 0.3,
        sustain: 0,
        release: 0.1,
      },
    }).toDestination();

    synth.volume.value = -10;

    const beatsPerBar = 4;
    const totalBeats = bars * beatsPerBar;
    const beatDuration = 60 / bpm;

    return new Promise((resolve) => {
      let beat = 0;

      const playBeat = () => {
        if (beat < totalBeats) {
          const isDownbeat = beat % beatsPerBar === 0;
          synth.triggerAttackRelease(isDownbeat ? 'C4' : 'G3', '16n');
          beat++;
          setTimeout(playBeat, beatDuration * 1000);
        } else {
          synth.dispose();
          resolve();
        }
      };

      playBeat();
    });
  }

  private async processRecording(bpm: number): Promise<RecordingResult> {
    const audioBlob = new Blob(this.audioChunks, { type: this.getSupportedMimeType() });
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = Tone.getContext().rawContext;

    if (!audioContext) {
      throw new Error('Audio context not available');
    }

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const duration = audioBuffer.duration;
    const durationBeats = (duration / 60) * bpm;

    return {
      audioBuffer,
      duration,
      durationBeats,
    };
  }
}

// Singleton instance
export const microphoneRecorder = new MicrophoneRecorder();
