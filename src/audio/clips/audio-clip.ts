// Audio clip with trim and fade capabilities

export interface AudioClipData {
  id: string;
  name: string;
  buffer: AudioBuffer;
  trimStart: number;  // seconds from start of buffer to begin playback
  trimEnd: number;    // seconds from start of buffer to end playback
  fadeIn: number;     // fade in duration in seconds
  fadeOut: number;    // fade out duration in seconds
  gain: number;       // clip volume 0-2
}

export interface AudioClipPlacement {
  clipId: string;
  startTime: number;  // start time in beats on the timeline
}

export class AudioClip implements AudioClipData {
  id: string;
  name: string;
  buffer: AudioBuffer;
  trimStart: number;
  trimEnd: number;
  fadeIn: number;
  fadeOut: number;
  gain: number;

  constructor(buffer: AudioBuffer, name = 'Audio Clip') {
    this.id = crypto.randomUUID();
    this.name = name;
    this.buffer = buffer;
    this.trimStart = 0;
    this.trimEnd = buffer.duration;
    this.fadeIn = 0;
    this.fadeOut = 0;
    this.gain = 1;
  }

  // Get the effective duration after trimming
  getDuration(): number {
    return this.trimEnd - this.trimStart;
  }

  // Get duration in beats at given BPM
  getDurationBeats(bpm: number): number {
    return (this.getDuration() * bpm) / 60;
  }

  // Set trim points (clamped to buffer bounds)
  setTrim(start: number, end: number): void {
    this.trimStart = Math.max(0, Math.min(start, this.buffer.duration));
    this.trimEnd = Math.max(this.trimStart, Math.min(end, this.buffer.duration));
  }

  // Set fade durations (clamped to clip duration)
  setFades(fadeIn: number, fadeOut: number): void {
    const duration = this.getDuration();
    this.fadeIn = Math.max(0, Math.min(fadeIn, duration / 2));
    this.fadeOut = Math.max(0, Math.min(fadeOut, duration / 2));
  }

  // Clone the clip with a new ID
  clone(): AudioClip {
    const clip = new AudioClip(this.buffer, `${this.name} (copy)`);
    clip.trimStart = this.trimStart;
    clip.trimEnd = this.trimEnd;
    clip.fadeIn = this.fadeIn;
    clip.fadeOut = this.fadeOut;
    clip.gain = this.gain;
    return clip;
  }

  // Get clip data for serialization (without buffer)
  toData(): Omit<AudioClipData, 'buffer'> & { bufferId: string } {
    return {
      id: this.id,
      name: this.name,
      bufferId: this.id, // In a real app, buffers would be stored separately
      trimStart: this.trimStart,
      trimEnd: this.trimEnd,
      fadeIn: this.fadeIn,
      fadeOut: this.fadeOut,
      gain: this.gain,
    };
  }
}

// Create audio clip from AudioBuffer
export function createAudioClip(buffer: AudioBuffer, name?: string): AudioClip {
  return new AudioClip(buffer, name);
}

// Split a clip at a specific point (in seconds from clip start)
export function splitAudioClip(clip: AudioClip, splitPoint: number): [AudioClip, AudioClip] {
  const absoluteSplitPoint = clip.trimStart + splitPoint;

  const firstHalf = clip.clone();
  firstHalf.id = crypto.randomUUID();
  firstHalf.name = `${clip.name} (1)`;
  firstHalf.trimEnd = absoluteSplitPoint;
  firstHalf.fadeOut = 0;

  const secondHalf = clip.clone();
  secondHalf.id = crypto.randomUUID();
  secondHalf.name = `${clip.name} (2)`;
  secondHalf.trimStart = absoluteSplitPoint;
  secondHalf.fadeIn = 0;

  return [firstHalf, secondHalf];
}
