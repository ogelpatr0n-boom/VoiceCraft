import * as Tone from 'tone';

export interface InstrumentInterface {
  id: string;
  name: string;
  type: 'synth' | 'drums' | 'sampler' | 'keys' | 'bass';

  // Core methods
  connect(destination: Tone.ToneAudioNode): void;
  disconnect(): void;
  dispose(): void;

  // Playback
  triggerAttack(note: string | number, time?: number, velocity?: number): void;
  triggerRelease(note: string | number, time?: number): void;
  triggerAttackRelease(
    note: string | number,
    duration: number | string,
    time?: number,
    velocity?: number
  ): void;
  releaseAll(time?: number): void;

  // Parameters
  setVolume(db: number): void;
  getVolume(): number;
  setMute(muted: boolean): void;
  isMuted(): boolean;

  // Preset management
  loadPreset(params: Record<string, unknown>): void;
  getPreset(): Record<string, unknown>;
}

export abstract class InstrumentBase implements InstrumentInterface {
  id: string;
  name: string;
  abstract type: 'synth' | 'drums' | 'sampler' | 'keys' | 'bass';

  protected output: Tone.Gain;
  protected muted = false;
  protected volumeDb = 0;

  constructor(name: string) {
    this.id = crypto.randomUUID();
    this.name = name;
    this.output = new Tone.Gain(1);
  }

  connect(destination: Tone.ToneAudioNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.output.disconnect();
  }

  dispose(): void {
    this.output.dispose();
  }

  setVolume(db: number): void {
    this.volumeDb = db;
    if (!this.muted) {
      this.output.gain.value = Tone.dbToGain(db);
    }
  }

  getVolume(): number {
    return this.volumeDb;
  }

  setMute(muted: boolean): void {
    this.muted = muted;
    this.output.gain.value = muted ? 0 : Tone.dbToGain(this.volumeDb);
  }

  isMuted(): boolean {
    return this.muted;
  }

  getOutput(): Tone.Gain {
    return this.output;
  }

  abstract triggerAttack(note: string | number, time?: number, velocity?: number): void;
  abstract triggerRelease(note: string | number, time?: number): void;
  abstract triggerAttackRelease(
    note: string | number,
    duration: number | string,
    time?: number,
    velocity?: number
  ): void;
  abstract releaseAll(time?: number): void;
  abstract loadPreset(params: Record<string, unknown>): void;
  abstract getPreset(): Record<string, unknown>;
}

// Helper to convert MIDI note number to Tone.js note string
export function midiToToneNote(midi: number): string {
  return Tone.Frequency(midi, 'midi').toNote();
}

// Helper to normalize velocity (0-127 to 0-1)
export function normalizeVelocity(velocity: number): number {
  return Math.max(0, Math.min(1, velocity / 127));
}
