import * as Tone from 'tone';
import { InstrumentBase } from './instrument-base';

export interface Slice {
  id: string;
  start: number;    // Start time in seconds
  end: number;      // End time in seconds
  pitch: number;    // Pitch shift in semitones
  reverse: boolean;
  volume: number;   // 0-1
  pan: number;      // -1 to 1
}

export interface BeatSlicerPreset {
  sliceMode: 'equal' | 'transient' | 'manual';
  numSlices: number;
  gateTime: number;     // 0-1, how much of the slice to play
  attack: number;
  release: number;
  pitchLock: boolean;   // Lock pitch when changing tempo
  reverse: boolean;     // Reverse all slices
  shuffle: boolean;     // Randomize slice order
}

const DEFAULT_PRESET: BeatSlicerPreset = {
  sliceMode: 'equal',
  numSlices: 16,
  gateTime: 0.9,
  attack: 0.001,
  release: 0.05,
  pitchLock: true,
  reverse: false,
  shuffle: false,
};

/**
 * Beat Slicer
 * Chops audio into slices that can be triggered individually
 * Essential for breakbeat, drum & bass, and creative sampling
 */
export class BeatSlicer extends InstrumentBase {
  type: 'sampler' = 'sampler';

  private buffer: AudioBuffer | null = null;
  private slices: Slice[] = [];
  private players: Map<string, Tone.Player> = new Map();
  private pitchShift: Tone.PitchShift;
  private envelope: Tone.AmplitudeEnvelope;
  private preset: BeatSlicerPreset;
  private originalBpm: number = 120;
  private isLoaded: boolean = false;

  constructor(name = 'Beat Slicer') {
    super(name);
    this.preset = { ...DEFAULT_PRESET };

    this.pitchShift = new Tone.PitchShift({
      pitch: 0,
      windowSize: 0.05,
    });

    this.envelope = new Tone.AmplitudeEnvelope({
      attack: this.preset.attack,
      decay: 0.01,
      sustain: 1,
      release: this.preset.release,
    });

    this.pitchShift.connect(this.envelope);
    this.envelope.connect(this.output);
  }

  /**
   * Load an audio file for slicing
   */
  async loadAudio(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const player = new Tone.Player({
        url,
        onload: () => {
          this.buffer = player.buffer.get() as AudioBuffer;
          player.dispose();
          this.isLoaded = true;
          this.createSlices();
          resolve();
        },
        onerror: reject,
      });
    });
  }

  /**
   * Load from AudioBuffer directly
   */
  loadBuffer(buffer: AudioBuffer, bpm: number = 120): void {
    this.buffer = buffer;
    this.originalBpm = bpm;
    this.isLoaded = true;
    this.createSlices();
  }

  /**
   * Create slices based on current mode
   */
  private createSlices(): void {
    if (!this.buffer) return;

    this.clearSlices();
    const duration = this.buffer.duration;

    switch (this.preset.sliceMode) {
      case 'equal':
        this.createEqualSlices(duration);
        break;
      case 'transient':
        this.createTransientSlices();
        break;
      case 'manual':
        // Manual mode - slices are added by user
        break;
    }
  }

  private createEqualSlices(duration: number): void {
    const sliceDuration = duration / this.preset.numSlices;

    for (let i = 0; i < this.preset.numSlices; i++) {
      this.slices.push({
        id: `slice-${i}`,
        start: i * sliceDuration,
        end: (i + 1) * sliceDuration,
        pitch: 0,
        reverse: this.preset.reverse,
        volume: 1,
        pan: 0,
      });
    }
  }

  private createTransientSlices(): void {
    if (!this.buffer) return;

    // Simple transient detection using amplitude changes
    const data = this.buffer.getChannelData(0);
    const sampleRate = this.buffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.01); // 10ms window
    const threshold = 0.2;

    const transients: number[] = [0]; // Always start at beginning
    let prevEnergy = 0;

    for (let i = windowSize; i < data.length - windowSize; i += windowSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += Math.abs(data[i + j]);
      }
      energy /= windowSize;

      // Detect sudden increase in energy
      if (energy > prevEnergy * (1 + threshold) && energy > 0.1) {
        const time = i / sampleRate;
        // Avoid slices too close together
        if (transients.length === 0 || time - transients[transients.length - 1] > 0.05) {
          transients.push(time);
        }
      }
      prevEnergy = energy;
    }

    transients.push(this.buffer.duration); // End marker

    // Create slices from transients
    for (let i = 0; i < transients.length - 1 && i < this.preset.numSlices; i++) {
      this.slices.push({
        id: `slice-${i}`,
        start: transients[i],
        end: transients[i + 1],
        pitch: 0,
        reverse: this.preset.reverse,
        volume: 1,
        pan: 0,
      });
    }
  }

  /**
   * Add a manual slice
   */
  addSlice(start: number, end: number): string {
    const id = `slice-${this.slices.length}`;
    this.slices.push({
      id,
      start,
      end,
      pitch: 0,
      reverse: false,
      volume: 1,
      pan: 0,
    });
    return id;
  }

  /**
   * Update a slice's properties
   */
  updateSlice(id: string, updates: Partial<Slice>): void {
    const slice = this.slices.find(s => s.id === id);
    if (slice) {
      Object.assign(slice, updates);
    }
  }

  /**
   * Remove a slice
   */
  removeSlice(id: string): void {
    this.slices = this.slices.filter(s => s.id !== id);
  }

  /**
   * Clear all slices
   */
  clearSlices(): void {
    // Stop and dispose all players
    for (const player of this.players.values()) {
      player.stop();
      player.dispose();
    }
    this.players.clear();
    this.slices = [];
  }

  /**
   * Get all slices
   */
  getSlices(): Slice[] {
    return [...this.slices];
  }

  /**
   * Trigger a specific slice by index
   */
  triggerSlice(index: number, time?: number, velocity = 100): void {
    if (index < 0 || index >= this.slices.length) return;
    this.playSlice(this.slices[index], time, velocity);
  }

  /**
   * Trigger a slice by ID
   */
  triggerSliceById(id: string, time?: number, velocity = 100): void {
    const slice = this.slices.find(s => s.id === id);
    if (slice) {
      this.playSlice(slice, time, velocity);
    }
  }

  private playSlice(slice: Slice, time?: number, velocity = 100): void {
    if (!this.buffer) return;

    const t = time ?? Tone.now();
    const vel = velocity / 127;

    // Create or reuse player for this slice
    let player = this.players.get(slice.id);

    if (!player) {
      player = new Tone.Player(this.buffer);
      player.connect(this.pitchShift);
      this.players.set(slice.id, player);
    }

    // Configure player
    player.reverse = slice.reverse;
    player.volume.value = Tone.gainToDb(slice.volume * vel);

    // Calculate duration with gate time
    const sliceDuration = slice.end - slice.start;
    const playDuration = sliceDuration * this.preset.gateTime;

    // Set pitch
    this.pitchShift.pitch = slice.pitch;

    // Trigger envelope and playback
    player.start(t, slice.start, playDuration);
    this.envelope.triggerAttackRelease(playDuration, t);
  }

  /**
   * Play all slices in sequence
   */
  playSequence(bpm: number = 120, time?: number): void {
    const t = time ?? Tone.now();
    const beatDuration = 60 / bpm;
    const sliceInterval = beatDuration / 4; // 16th notes

    this.slices.forEach((slice, index) => {
      const sliceIndex = this.preset.shuffle
        ? Math.floor(Math.random() * this.slices.length)
        : index;

      this.playSlice(this.slices[sliceIndex], t + index * sliceInterval, 100);
    });
  }

  // Implement abstract methods
  triggerAttack(note: string | number, time?: number, velocity = 100): void {
    // Map MIDI notes to slice indices (C2 = 36 = slice 0)
    const midiNote = typeof note === 'number' ? note : Tone.Frequency(note).toMidi();
    const sliceIndex = midiNote - 36;
    this.triggerSlice(sliceIndex, time, velocity);
  }

  triggerRelease(_note: string | number, _time?: number): void {
    // Slices don't need explicit release - they play their full duration
  }

  triggerAttackRelease(
    note: string | number,
    _duration: number | string,
    time?: number,
    velocity = 100
  ): void {
    this.triggerAttack(note, time, velocity);
  }

  releaseAll(_time?: number): void {
    // Stop all players
    for (const player of this.players.values()) {
      player.stop();
    }
  }

  setNumSlices(num: number): void {
    this.preset.numSlices = Math.max(1, Math.min(64, num));
    this.createSlices();
  }

  setSliceMode(mode: 'equal' | 'transient' | 'manual'): void {
    this.preset.sliceMode = mode;
    if (mode !== 'manual') {
      this.createSlices();
    }
  }

  setGateTime(time: number): void {
    this.preset.gateTime = Math.max(0.1, Math.min(1, time));
  }

  loadPreset(params: Record<string, unknown>): void {
    this.preset = { ...DEFAULT_PRESET, ...params as Partial<BeatSlicerPreset> };
    this.envelope.attack = this.preset.attack;
    this.envelope.release = this.preset.release;
    this.createSlices();
  }

  getPreset(): Record<string, unknown> {
    return { ...this.preset };
  }

  dispose(): void {
    this.clearSlices();
    this.pitchShift.dispose();
    this.envelope.dispose();
    super.dispose();
  }
}

// Beat slicer presets
export const BEAT_SLICER_PRESETS: Record<string, Partial<BeatSlicerPreset>> = {
  'Standard 16': { sliceMode: 'equal', numSlices: 16, gateTime: 0.9 },
  'Standard 8': { sliceMode: 'equal', numSlices: 8, gateTime: 0.9 },
  'Transient': { sliceMode: 'transient', numSlices: 16, gateTime: 1 },
  'Staccato': { sliceMode: 'equal', numSlices: 16, gateTime: 0.5, release: 0.01 },
  'Glitch': { sliceMode: 'equal', numSlices: 32, gateTime: 0.7, shuffle: true },
  'Reverse': { sliceMode: 'equal', numSlices: 16, gateTime: 0.9, reverse: true },
  'Drum & Bass': { sliceMode: 'transient', numSlices: 32, gateTime: 0.8 },
};
