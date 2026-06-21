import * as Tone from 'tone';
import type { TimeSignature } from './time-utils';
import { beatsToSeconds, secondsToBeats } from './time-utils';

export type TransportState = 'stopped' | 'playing' | 'paused';

export interface TransportCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onLoop?: () => void;
  onBeat?: (beat: number) => void;
  onBar?: (bar: number) => void;
}

class TransportManager {
  private state: TransportState = 'stopped';
  private bpm = 120;
  private timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
  private loopEnabled = false;
  private loopStart = 0; // in beats
  private loopEnd = 16;  // in beats (4 bars at 4/4)
  private callbacks: TransportCallbacks = {};
  private beatScheduleId: number | null = null;
  private lastBeat = -1;
  private lastBar = -1;

  constructor() {
    // Initialize Tone.js Transport - deferred until audio context is ready
    try {
      Tone.getTransport().bpm.value = this.bpm;
    } catch (e) {
      // AudioContext not ready yet, will be set when play() is called
    }
  }

  setBpm(bpm: number): void {
    this.bpm = Math.max(20, Math.min(300, bpm));
    try {
      Tone.getTransport().bpm.value = this.bpm;
    } catch (e) {
      // AudioContext not ready
    }
  }

  getBpm(): number {
    return this.bpm;
  }

  setTimeSignature(sig: TimeSignature): void {
    this.timeSignature = sig;
    try {
      Tone.getTransport().timeSignature = [sig.numerator, sig.denominator];
    } catch (e) {
      // AudioContext not ready
    }
  }

  getTimeSignature(): TimeSignature {
    return { ...this.timeSignature };
  }

  setLoopEnabled(enabled: boolean): void {
    this.loopEnabled = enabled;
    try {
      Tone.getTransport().loop = enabled;
    } catch (e) {
      // AudioContext not ready
    }
  }

  isLoopEnabled(): boolean {
    return this.loopEnabled;
  }

  setLoopPoints(startBeats: number, endBeats: number): void {
    this.loopStart = startBeats;
    this.loopEnd = endBeats;
    Tone.getTransport().loopStart = beatsToSeconds(startBeats, this.bpm);
    Tone.getTransport().loopEnd = beatsToSeconds(endBeats, this.bpm);
  }

  getLoopPoints(): { start: number; end: number } {
    return { start: this.loopStart, end: this.loopEnd };
  }

  setCallbacks(callbacks: TransportCallbacks): void {
    this.callbacks = callbacks;
  }

  async play(): Promise<void> {
    if (this.state === 'playing') return;

    await Tone.start();
    Tone.getTransport().start();
    this.state = 'playing';
    this.startBeatTracking();
    this.callbacks.onPlay?.();
  }

  pause(): void {
    if (this.state !== 'playing') return;

    Tone.getTransport().pause();
    this.state = 'paused';
    this.stopBeatTracking();
    this.callbacks.onPause?.();
  }

  stop(): void {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    this.state = 'stopped';
    this.stopBeatTracking();
    this.lastBeat = -1;
    this.lastBar = -1;
    this.callbacks.onStop?.();
  }

  getState(): TransportState {
    return this.state;
  }

  // Get current position in beats
  getPositionBeats(): number {
    const seconds = Tone.getTransport().seconds;
    return secondsToBeats(seconds, this.bpm);
  }

  // Get current position in seconds
  getPositionSeconds(): number {
    return Tone.getTransport().seconds;
  }

  // Set position in beats
  setPositionBeats(beats: number): void {
    const seconds = beatsToSeconds(beats, this.bpm);
    Tone.getTransport().seconds = seconds;
  }

  // Set position in seconds
  setPositionSeconds(seconds: number): void {
    Tone.getTransport().seconds = seconds;
  }

  private startBeatTracking(): void {
    const checkBeat = () => {
      if (this.state !== 'playing') return;

      const beats = this.getPositionBeats();
      const currentBeat = Math.floor(beats);
      const currentBar = Math.floor(beats / this.timeSignature.numerator);

      if (currentBeat !== this.lastBeat) {
        this.lastBeat = currentBeat;
        this.callbacks.onBeat?.(currentBeat);
      }

      if (currentBar !== this.lastBar) {
        this.lastBar = currentBar;
        this.callbacks.onBar?.(currentBar);
      }

      this.beatScheduleId = requestAnimationFrame(checkBeat);
    };

    this.beatScheduleId = requestAnimationFrame(checkBeat);
  }

  private stopBeatTracking(): void {
    if (this.beatScheduleId !== null) {
      cancelAnimationFrame(this.beatScheduleId);
      this.beatScheduleId = null;
    }
  }

  // Schedule a callback at a specific time in beats
  scheduleAtBeat(callback: () => void, beat: number): number {
    const time = beatsToSeconds(beat, this.bpm);
    return Tone.getTransport().schedule(callback, time);
  }

  // Schedule a repeating callback
  scheduleRepeat(callback: (time: number) => void, interval: string | number): number {
    return Tone.getTransport().scheduleRepeat(callback, interval);
  }

  // Clear a scheduled event
  clearSchedule(id: number): void {
    Tone.getTransport().clear(id);
  }

  // Clear all scheduled events
  clearAllSchedules(): void {
    Tone.getTransport().cancel();
  }

  dispose(): void {
    this.stop();
    this.clearAllSchedules();
  }
}

// Singleton instance
export const transport = new TransportManager();
