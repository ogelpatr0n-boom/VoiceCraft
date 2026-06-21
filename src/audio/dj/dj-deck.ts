import * as Tone from 'tone';

export interface CuePoint {
  id: string;
  position: number;  // In seconds
  name: string;
  color: string;
}

export interface DeckState {
  isPlaying: boolean;
  isLoaded: boolean;
  position: number;      // Current position in seconds
  duration: number;      // Track duration
  bpm: number;           // Detected or set BPM
  pitch: number;         // Pitch adjustment in semitones (-12 to +12)
  tempo: number;         // Tempo adjustment (0.5 to 2.0)
  volume: number;        // Volume 0-1
  eqLow: number;         // Low EQ in dB
  eqMid: number;         // Mid EQ in dB
  eqHigh: number;        // High EQ in dB
  filter: number;        // Filter position (-1 to 1, 0 = bypass)
  loopStart: number | null;
  loopEnd: number | null;
  isLooping: boolean;
  cuePoints: CuePoint[];
}

/**
 * DJ Deck - Single turntable/CDJ emulation
 * Handles playback, pitch/tempo control, EQ, effects, cue points, and looping
 */
export class DJDeck {
  private player: Tone.Player | null = null;
  private pitchShift: Tone.PitchShift;
  private eq3: Tone.EQ3;
  private filter: Tone.Filter;
  private filterBypass: Tone.Gain;
  private output: Tone.Gain;
  private analyser: Tone.Analyser;

  private state: DeckState = {
    isPlaying: false,
    isLoaded: false,
    position: 0,
    duration: 0,
    bpm: 120,
    pitch: 0,
    tempo: 1,
    volume: 1,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    filter: 0,
    loopStart: null,
    loopEnd: null,
    isLooping: false,
    cuePoints: [],
  };

  private positionInterval: number | null = null;
  private onPositionUpdate: ((position: number) => void) | null = null;
  private onStateChange: ((state: DeckState) => void) | null = null;

  constructor() {
    // Pitch shift for key adjustment
    this.pitchShift = new Tone.PitchShift({
      pitch: 0,
      windowSize: 0.1,
      delayTime: 0,
    });

    // 3-band EQ
    this.eq3 = new Tone.EQ3({
      low: 0,
      mid: 0,
      high: 0,
      lowFrequency: 250,
      highFrequency: 4000,
    });

    // DJ filter (low-pass/high-pass combo)
    this.filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 20000,
      Q: 1,
    });

    this.filterBypass = new Tone.Gain(1);

    // Output gain
    this.output = new Tone.Gain(1);

    // Analyser for waveform/spectrum display
    this.analyser = new Tone.Analyser('waveform', 256);

    // Connect chain: pitchShift -> eq -> filter -> output
    this.pitchShift.connect(this.eq3);
    this.eq3.connect(this.filter);
    this.filter.connect(this.output);
    this.output.connect(this.analyser);
  }

  /**
   * Load an audio file into the deck
   */
  async loadTrack(url: string): Promise<void> {
    // Dispose of existing player
    if (this.player) {
      this.player.dispose();
    }

    this.player = new Tone.Player({
      url,
      onload: () => {
        if (this.player && this.player.buffer) {
          this.state.duration = this.player.buffer.duration;
          this.state.isLoaded = true;
          this.state.position = 0;
          this.notifyStateChange();
        }
      },
    });

    this.player.connect(this.pitchShift);
    this.player.playbackRate = this.state.tempo;
  }

  /**
   * Load from AudioBuffer
   */
  loadBuffer(buffer: AudioBuffer): void {
    if (this.player) {
      this.player.dispose();
    }

    this.player = new Tone.Player(buffer);
    this.player.connect(this.pitchShift);
    this.player.playbackRate = this.state.tempo;

    this.state.duration = buffer.duration;
    this.state.isLoaded = true;
    this.state.position = 0;
    this.notifyStateChange();
  }

  /**
   * Play the track
   */
  play(): void {
    if (!this.player || !this.state.isLoaded) return;

    this.player.start(undefined, this.state.position);
    this.state.isPlaying = true;
    this.startPositionTracking();
    this.notifyStateChange();
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.player) return;

    this.player.stop();
    this.state.isPlaying = false;
    this.stopPositionTracking();
    this.notifyStateChange();
  }

  /**
   * Stop and return to beginning
   */
  stop(): void {
    if (!this.player) return;

    this.player.stop();
    this.state.isPlaying = false;
    this.state.position = 0;
    this.stopPositionTracking();
    this.notifyStateChange();
  }

  /**
   * Seek to position in seconds
   */
  seek(position: number): void {
    this.state.position = Math.max(0, Math.min(position, this.state.duration));

    if (this.state.isPlaying && this.player) {
      this.player.stop();
      this.player.start(undefined, this.state.position);
    }

    this.notifyStateChange();
  }

  /**
   * Jump to a cue point
   */
  jumpToCue(cueId: string): void {
    const cue = this.state.cuePoints.find(c => c.id === cueId);
    if (cue) {
      this.seek(cue.position);
    }
  }

  /**
   * Set a cue point at current position
   */
  setCuePoint(name: string, color: string = '#ff0000'): string {
    const id = crypto.randomUUID();
    this.state.cuePoints.push({
      id,
      position: this.state.position,
      name,
      color,
    });
    this.notifyStateChange();
    return id;
  }

  /**
   * Remove a cue point
   */
  removeCuePoint(cueId: string): void {
    this.state.cuePoints = this.state.cuePoints.filter(c => c.id !== cueId);
    this.notifyStateChange();
  }

  /**
   * Set loop points
   */
  setLoop(start: number, end: number): void {
    this.state.loopStart = start;
    this.state.loopEnd = end;
    this.state.isLooping = true;
    this.notifyStateChange();
  }

  /**
   * Toggle loop on/off
   */
  toggleLoop(): void {
    this.state.isLooping = !this.state.isLooping;
    this.notifyStateChange();
  }

  /**
   * Clear loop points
   */
  clearLoop(): void {
    this.state.loopStart = null;
    this.state.loopEnd = null;
    this.state.isLooping = false;
    this.notifyStateChange();
  }

  /**
   * Set pitch (in semitones)
   */
  setPitch(semitones: number): void {
    this.state.pitch = Math.max(-12, Math.min(12, semitones));
    this.pitchShift.pitch = this.state.pitch;
    this.notifyStateChange();
  }

  /**
   * Set tempo (playback rate)
   */
  setTempo(rate: number): void {
    this.state.tempo = Math.max(0.5, Math.min(2, rate));
    if (this.player) {
      this.player.playbackRate = this.state.tempo;
    }
    this.notifyStateChange();
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    this.output.gain.value = this.state.volume;
    this.notifyStateChange();
  }

  /**
   * Set EQ values in dB
   */
  setEQ(low: number, mid: number, high: number): void {
    this.state.eqLow = low;
    this.state.eqMid = mid;
    this.state.eqHigh = high;

    this.eq3.low.value = low;
    this.eq3.mid.value = mid;
    this.eq3.high.value = high;

    this.notifyStateChange();
  }

  /**
   * Set filter position (-1 = full low-pass, 0 = bypass, 1 = full high-pass)
   */
  setFilter(position: number): void {
    this.state.filter = Math.max(-1, Math.min(1, position));

    if (Math.abs(position) < 0.05) {
      // Bypass
      this.filter.frequency.value = 20000;
      this.filter.type = 'lowpass';
    } else if (position < 0) {
      // Low-pass
      this.filter.type = 'lowpass';
      const freq = 20000 * Math.pow(10, position * 2); // Logarithmic
      this.filter.frequency.value = Math.max(100, freq);
    } else {
      // High-pass
      this.filter.type = 'highpass';
      const freq = 20 * Math.pow(10, position * 3);
      this.filter.frequency.value = Math.min(10000, freq);
    }

    this.notifyStateChange();
  }

  /**
   * Nudge tempo temporarily (for beat matching)
   */
  nudge(amount: number): void {
    if (!this.player) return;

    const originalRate = this.state.tempo;
    this.player.playbackRate = originalRate + amount * 0.05;

    // Return to normal after 200ms
    setTimeout(() => {
      if (this.player) {
        this.player.playbackRate = originalRate;
      }
    }, 200);
  }

  /**
   * Simulate vinyl scratch
   */
  scratch(amount: number): void {
    if (!this.player || !this.state.isPlaying) return;

    // Temporarily change playback rate based on scratch amount
    this.player.playbackRate = this.state.tempo * (1 + amount);
  }

  /**
   * Get output node for connecting to mixer
   */
  getOutput(): Tone.Gain {
    return this.output;
  }

  /**
   * Get analyser for visualization
   */
  getAnalyser(): Tone.Analyser {
    return this.analyser;
  }

  /**
   * Get current waveform data
   */
  getWaveformData(): Float32Array {
    return this.analyser.getValue() as Float32Array;
  }

  /**
   * Get current state
   */
  getState(): DeckState {
    return { ...this.state };
  }

  /**
   * Set BPM (for sync calculations)
   */
  setBpm(bpm: number): void {
    this.state.bpm = bpm;
    this.notifyStateChange();
  }

  /**
   * Set callback for position updates
   */
  onPosition(callback: (position: number) => void): void {
    this.onPositionUpdate = callback;
  }

  /**
   * Set callback for state changes
   */
  onState(callback: (state: DeckState) => void): void {
    this.onStateChange = callback;
  }

  private startPositionTracking(): void {
    this.stopPositionTracking();
    const startTime = Tone.now();
    const startPosition = this.state.position;

    this.positionInterval = window.setInterval(() => {
      if (this.state.isPlaying) {
        const elapsed = (Tone.now() - startTime) * this.state.tempo;
        this.state.position = startPosition + elapsed;

        // Handle looping
        if (this.state.isLooping && this.state.loopEnd !== null) {
          if (this.state.position >= this.state.loopEnd) {
            this.seek(this.state.loopStart || 0);
            return;
          }
        }

        // Handle end of track
        if (this.state.position >= this.state.duration) {
          this.stop();
          return;
        }

        this.onPositionUpdate?.(this.state.position);
      }
    }, 50);
  }

  private stopPositionTracking(): void {
    if (this.positionInterval !== null) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }
  }

  private notifyStateChange(): void {
    this.onStateChange?.(this.getState());
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.stopPositionTracking();
    if (this.player) {
      this.player.dispose();
    }
    this.pitchShift.dispose();
    this.eq3.dispose();
    this.filter.dispose();
    this.filterBypass.dispose();
    this.output.dispose();
    this.analyser.dispose();
  }
}
