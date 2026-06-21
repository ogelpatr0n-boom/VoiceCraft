import * as Tone from 'tone';

export interface AudioInputDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

export interface RecordingTrack {
  id: string;
  name: string;
  deviceId: string;
  armed: boolean;
  monitoring: boolean;
  level: number;
  stream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  analyser: AnalyserNode | null;
}

export interface MultiTrackRecordingResult {
  trackId: string;
  trackName: string;
  audioBuffer: AudioBuffer;
  duration: number;
  durationBeats: number;
}

interface RecordingCallbacks {
  onLevel?: (trackId: string, level: number) => void;
  onRecordingComplete?: (results: MultiTrackRecordingResult[]) => void;
  onError?: (error: Error) => void;
  onDevicesChanged?: (devices: AudioInputDevice[]) => void;
}

class MultiTrackRecorder {
  private tracks: Map<string, RecordingTrack> = new Map();
  private isRecording = false;
  private callbacks: RecordingCallbacks = {};
  private levelIntervals: Map<string, number> = new Map();
  private availableDevices: AudioInputDevice[] = [];

  constructor() {
    // Listen for device changes
    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.refreshDevices();
      });
    }
  }

  async refreshDevices(): Promise<AudioInputDevice[]> {
    try {
      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
          groupId: d.groupId,
        }));

      this.callbacks.onDevicesChanged?.(this.availableDevices);
      return this.availableDevices;
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return [];
    }
  }

  getAvailableDevices(): AudioInputDevice[] {
    return this.availableDevices;
  }

  addTrack(name: string, deviceId: string): string {
    const id = crypto.randomUUID();
    const track: RecordingTrack = {
      id,
      name,
      deviceId,
      armed: true,
      monitoring: false,
      level: 0,
      stream: null,
      mediaRecorder: null,
      audioChunks: [],
      analyser: null,
    };
    this.tracks.set(id, track);
    return id;
  }

  removeTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (track) {
      this.stopTrackMonitoring(trackId);
      if (track.stream) {
        track.stream.getTracks().forEach(t => t.stop());
      }
      this.tracks.delete(trackId);
    }
  }

  getTrack(trackId: string): RecordingTrack | undefined {
    return this.tracks.get(trackId);
  }

  getAllTracks(): RecordingTrack[] {
    return Array.from(this.tracks.values());
  }

  setTrackDevice(trackId: string, deviceId: string): void {
    const track = this.tracks.get(trackId);
    if (track) {
      // Stop existing stream if any
      if (track.stream) {
        track.stream.getTracks().forEach(t => t.stop());
        track.stream = null;
      }
      track.deviceId = deviceId;
    }
  }

  setTrackArmed(trackId: string, armed: boolean): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.armed = armed;
    }
  }

  setTrackName(trackId: string, name: string): void {
    const track = this.tracks.get(trackId);
    if (track) {
      track.name = name;
    }
  }

  async startTrackMonitoring(trackId: string): Promise<void> {
    const track = this.tracks.get(trackId);
    if (!track) return;

    try {
      // Get stream for this specific device
      track.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: track.deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set up level monitoring
      const audioContext = Tone.getContext().rawContext as AudioContext;
      if (audioContext && track.stream) {
        const source = audioContext.createMediaStreamSource(track.stream);
        track.analyser = audioContext.createAnalyser();
        track.analyser.fftSize = 256;
        source.connect(track.analyser);

        const dataArray = new Uint8Array(track.analyser.frequencyBinCount);
        const interval = window.setInterval(() => {
          if (track.analyser) {
            track.analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            track.level = average / 255;
            this.callbacks.onLevel?.(trackId, track.level);
          }
        }, 50);
        this.levelIntervals.set(trackId, interval);
      }

      track.monitoring = true;
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      throw error;
    }
  }

  stopTrackMonitoring(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) return;

    const interval = this.levelIntervals.get(trackId);
    if (interval) {
      clearInterval(interval);
      this.levelIntervals.delete(trackId);
    }

    track.monitoring = false;
    track.level = 0;
  }

  async startRecording(bpm: number = 120): Promise<void> {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    const armedTracks = this.getAllTracks().filter(t => t.armed);
    if (armedTracks.length === 0) {
      throw new Error('No tracks armed for recording');
    }

    // Ensure all armed tracks have streams
    for (const track of armedTracks) {
      if (!track.stream) {
        await this.startTrackMonitoring(track.id);
      }
    }

    this.isRecording = true;

    // Start recording on all armed tracks simultaneously
    const startTime = performance.now();

    for (const track of armedTracks) {
      if (!track.stream) continue;

      track.audioChunks = [];
      track.mediaRecorder = new MediaRecorder(track.stream, {
        mimeType: this.getSupportedMimeType(),
      });

      track.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          track.audioChunks.push(event.data);
        }
      };

      track.mediaRecorder.start(100); // Collect data every 100ms
    }
  }

  async stopRecording(bpm: number = 120): Promise<MultiTrackRecordingResult[]> {
    if (!this.isRecording) {
      return [];
    }

    this.isRecording = false;

    const results: MultiTrackRecordingResult[] = [];
    const armedTracks = this.getAllTracks().filter(t => t.armed && t.mediaRecorder);

    // Stop all recorders and wait for data
    const stopPromises = armedTracks.map(track => {
      return new Promise<MultiTrackRecordingResult | null>(async (resolve) => {
        if (!track.mediaRecorder || track.mediaRecorder.state === 'inactive') {
          resolve(null);
          return;
        }

        track.mediaRecorder.onstop = async () => {
          try {
            const result = await this.processTrackRecording(track, bpm);
            resolve(result);
          } catch (error) {
            console.error('Error processing track:', error);
            resolve(null);
          }
        };

        track.mediaRecorder.stop();
      });
    });

    const trackResults = await Promise.all(stopPromises);
    const validResults = trackResults.filter((r): r is MultiTrackRecordingResult => r !== null);

    this.callbacks.onRecordingComplete?.(validResults);
    return validResults;
  }

  cancelRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;

    for (const track of this.tracks.values()) {
      if (track.mediaRecorder && track.mediaRecorder.state !== 'inactive') {
        track.mediaRecorder.stop();
      }
      track.audioChunks = [];
      track.mediaRecorder = null;
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  setCallbacks(callbacks: RecordingCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  dispose(): void {
    this.cancelRecording();

    for (const trackId of this.tracks.keys()) {
      this.removeTrack(trackId);
    }

    this.tracks.clear();
    this.levelIntervals.clear();
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

  private async processTrackRecording(
    track: RecordingTrack,
    bpm: number
  ): Promise<MultiTrackRecordingResult> {
    const audioBlob = new Blob(track.audioChunks, { type: this.getSupportedMimeType() });
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = Tone.getContext().rawContext;

    if (!audioContext) {
      throw new Error('Audio context not available');
    }

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const duration = audioBuffer.duration;
    const durationBeats = (duration / 60) * bpm;

    return {
      trackId: track.id,
      trackName: track.name,
      audioBuffer,
      duration,
      durationBeats,
    };
  }
}

// Singleton instance
export const multiTrackRecorder = new MultiTrackRecorder();
