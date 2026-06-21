import * as Tone from 'tone';
import { InstrumentBase } from './instrument-base';

export interface GranularSynthPreset {
  grainSize: number;        // Grain duration in seconds (0.01-0.5)
  overlap: number;          // Number of overlapping grains (1-8)
  pitch: number;            // Pitch shift in semitones
  pitchRandom: number;      // Random pitch variation in semitones
  position: number;         // Playhead position in buffer (0-1)
  positionRandom: number;   // Random position variation (0-1)
  density: number;          // Grains per second
  reverse: number;          // Probability of reversed grains (0-1)
  spread: number;           // Stereo spread (0-1)
  attack: number;           // Grain envelope attack
  release: number;          // Grain envelope release
  filter: number;           // Low-pass filter frequency
}

const DEFAULT_PRESET: GranularSynthPreset = {
  grainSize: 0.1,
  overlap: 4,
  pitch: 0,
  pitchRandom: 0,
  position: 0,
  positionRandom: 0.1,
  density: 20,
  reverse: 0,
  spread: 0.5,
  attack: 0.01,
  release: 0.05,
  filter: 20000,
};

export const GRANULAR_PRESETS: Record<string, Partial<GranularSynthPreset>> = {
  'Default': DEFAULT_PRESET,
  'Ambient Pad': {
    grainSize: 0.2,
    overlap: 6,
    pitchRandom: 0.1,
    positionRandom: 0.3,
    density: 15,
    spread: 0.8,
    attack: 0.05,
    release: 0.1,
  },
  'Texture': {
    grainSize: 0.05,
    overlap: 8,
    pitchRandom: 0.5,
    positionRandom: 0.5,
    density: 40,
    spread: 1,
  },
  'Freeze': {
    grainSize: 0.15,
    overlap: 4,
    positionRandom: 0.02,
    density: 20,
    spread: 0.3,
  },
  'Glitch': {
    grainSize: 0.02,
    overlap: 2,
    pitchRandom: 2,
    positionRandom: 0.8,
    density: 50,
    reverse: 0.5,
  },
  'Shimmer': {
    grainSize: 0.1,
    overlap: 6,
    pitch: 12,
    pitchRandom: 0.2,
    positionRandom: 0.1,
    density: 25,
    spread: 0.7,
    filter: 8000,
  },
  'Dark Drone': {
    grainSize: 0.3,
    overlap: 4,
    pitch: -12,
    pitchRandom: 0.3,
    positionRandom: 0.2,
    density: 10,
    spread: 0.6,
    filter: 2000,
  },
  'Scatter': {
    grainSize: 0.03,
    overlap: 3,
    pitchRandom: 1,
    positionRandom: 1,
    density: 30,
    reverse: 0.3,
    spread: 1,
  },
};

interface Grain {
  player: Tone.Player;
  panner: Tone.Panner;
  envelope: Tone.AmplitudeEnvelope;
  timeout: number;
}

/**
 * Granular Synthesizer
 * Creates textures and atmospheres by playing many small "grains" of audio
 */
export class GranularSynth extends InstrumentBase {
  type: 'sampler' = 'sampler';

  private buffer: AudioBuffer | null = null;
  private grains: Grain[] = [];
  private isPlaying: boolean = false;
  private schedulerId: number | null = null;
  private filter: Tone.Filter;
  private preset: GranularSynthPreset;
  private maxGrains: number = 32;

  constructor(name = 'Granular Synth') {
    super(name);
    this.preset = { ...DEFAULT_PRESET };

    this.filter = new Tone.Filter({
      type: 'lowpass',
      frequency: this.preset.filter,
    });

    this.filter.connect(this.output);
  }

  /**
   * Load audio from URL
   */
  async loadAudio(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const player = new Tone.Player({
        url,
        onload: () => {
          this.buffer = player.buffer.get() as AudioBuffer;
          player.dispose();
          resolve();
        },
        onerror: reject,
      });
    });
  }

  /**
   * Load from AudioBuffer
   */
  loadBuffer(buffer: AudioBuffer): void {
    this.buffer = buffer;
  }

  /**
   * Start granular playback
   */
  start(time?: number): void {
    if (!this.buffer || this.isPlaying) return;

    this.isPlaying = true;
    this.scheduleGrains();
  }

  /**
   * Stop granular playback
   */
  stop(time?: number): void {
    this.isPlaying = false;

    if (this.schedulerId !== null) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }

    // Stop all active grains
    this.grains.forEach(grain => {
      grain.player.stop();
      clearTimeout(grain.timeout);
    });
    this.grains = [];
  }

  private scheduleGrains(): void {
    const intervalMs = 1000 / this.preset.density;

    this.schedulerId = window.setInterval(() => {
      if (!this.isPlaying || !this.buffer) return;

      // Clean up finished grains
      this.grains = this.grains.filter(g => {
        // Grains are cleaned up by their timeout
        return true;
      });

      // Limit max grains
      if (this.grains.length >= this.maxGrains) return;

      // Spawn new grain
      this.spawnGrain();
    }, intervalMs);
  }

  private spawnGrain(): void {
    if (!this.buffer) return;

    const t = Tone.now();

    // Calculate grain parameters with randomization
    const position = this.preset.position + (Math.random() - 0.5) * this.preset.positionRandom;
    const clampedPosition = Math.max(0, Math.min(1, position));
    const startTime = clampedPosition * this.buffer.duration;

    const pitch = this.preset.pitch + (Math.random() - 0.5) * this.preset.pitchRandom * 2;
    const playbackRate = Math.pow(2, pitch / 12);

    const reverse = Math.random() < this.preset.reverse;
    const pan = (Math.random() - 0.5) * 2 * this.preset.spread;

    // Create grain player
    const player = new Tone.Player(this.buffer);
    player.playbackRate = playbackRate;
    player.reverse = reverse;

    // Create panner for stereo spread
    const panner = new Tone.Panner(pan);

    // Create envelope for smooth grain
    const envelope = new Tone.AmplitudeEnvelope({
      attack: this.preset.attack,
      decay: 0.01,
      sustain: 1,
      release: this.preset.release,
    });

    // Connect chain
    player.connect(envelope);
    envelope.connect(panner);
    panner.connect(this.filter);

    // Calculate grain duration
    const grainDuration = this.preset.grainSize;

    // Start grain
    player.start(t, startTime, grainDuration + this.preset.attack + this.preset.release);
    envelope.triggerAttackRelease(grainDuration, t);

    // Schedule cleanup
    const timeout = window.setTimeout(() => {
      player.dispose();
      panner.dispose();
      envelope.dispose();
      this.grains = this.grains.filter(g => g.player !== player);
    }, (grainDuration + this.preset.attack + this.preset.release) * 1000 + 100);

    this.grains.push({ player, panner, envelope, timeout });
  }

  // Position control (0-1)
  setPosition(position: number): void {
    this.preset.position = Math.max(0, Math.min(1, position));
  }

  // For keyboard control - position scrubbing
  triggerAttack(note: string | number, time?: number, velocity = 100): void {
    // Map note to position (C2 = 0, C4 = 1)
    const midiNote = typeof note === 'number' ? note : Tone.Frequency(note).toMidi();
    const position = (midiNote - 36) / 24; // 2 octave range
    this.setPosition(position);

    if (!this.isPlaying) {
      this.start(time);
    }
  }

  triggerRelease(_note: string | number, _time?: number): void {
    // Don't stop on release - granular continues
  }

  triggerAttackRelease(
    note: string | number,
    duration: number | string,
    time?: number,
    velocity = 100
  ): void {
    this.triggerAttack(note, time, velocity);

    const dur = Tone.Time(duration).toSeconds();
    const t = time ?? Tone.now();

    setTimeout(() => {
      // Optionally stop after duration
      // this.stop();
    }, (t - Tone.now() + dur) * 1000);
  }

  releaseAll(time?: number): void {
    this.stop(time);
  }

  loadPreset(params: Record<string, unknown>): void {
    this.preset = { ...DEFAULT_PRESET, ...params as Partial<GranularSynthPreset> };
    this.filter.frequency.value = this.preset.filter;
  }

  getPreset(): Record<string, unknown> {
    return { ...this.preset };
  }

  dispose(): void {
    this.stop();
    this.filter.dispose();
    super.dispose();
  }
}
