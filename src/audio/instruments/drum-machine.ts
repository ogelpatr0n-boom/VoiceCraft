import * as Tone from 'tone';
import { InstrumentBase, normalizeVelocity } from './instrument-base';

// Standard 16-pad drum layout (4x4)
export const DRUM_PADS = [
  // Row 1 (bottom)
  { note: 36, name: 'Kick', shortName: 'KCK' },
  { note: 37, name: 'Rim', shortName: 'RIM' },
  { note: 38, name: 'Snare', shortName: 'SNR' },
  { note: 39, name: 'Clap', shortName: 'CLP' },
  // Row 2
  { note: 40, name: 'Tom Low', shortName: 'TL' },
  { note: 41, name: 'Tom Mid', shortName: 'TM' },
  { note: 42, name: 'Closed HH', shortName: 'CHH' },
  { note: 43, name: 'Open HH', shortName: 'OHH' },
  // Row 3
  { note: 44, name: 'Tom Hi', shortName: 'TH' },
  { note: 45, name: 'Crash', shortName: 'CRS' },
  { note: 46, name: 'Ride', shortName: 'RDE' },
  { note: 47, name: 'Perc 1', shortName: 'P1' },
  // Row 4 (top)
  { note: 48, name: 'Perc 2', shortName: 'P2' },
  { note: 49, name: 'Perc 3', shortName: 'P3' },
  { note: 50, name: 'Perc 4', shortName: 'P4' },
  { note: 51, name: 'Cowbell', shortName: 'COW' },
] as const;

export type DrumPadInfo = typeof DRUM_PADS[number];

// Synthesized drum sounds using Tone.js
interface DrumVoice {
  trigger: (time?: number, velocity?: number) => void;
  dispose: () => void;
}

function createKick(output: Tone.ToneAudioNode): DrumVoice {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
  }).connect(output);

  return {
    trigger: (time, velocity = 1) => synth.triggerAttackRelease('C1', '8n', time, velocity),
    dispose: () => synth.dispose(),
  };
}

function createSnare(output: Tone.ToneAudioNode): DrumVoice {
  const noise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
  }).connect(output);

  const body = new Tone.MembraneSynth({
    pitchDecay: 0.01,
    octaves: 4,
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
  }).connect(output);

  return {
    trigger: (time, velocity = 1) => {
      noise.triggerAttackRelease('8n', time, velocity * 0.5);
      body.triggerAttackRelease('D2', '16n', time, velocity);
    },
    dispose: () => {
      noise.dispose();
      body.dispose();
    },
  };
}

function createHiHat(output: Tone.ToneAudioNode, open: boolean): DrumVoice {
  // Use filtered noise for more reliable hi-hat sound
  const noise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: {
      attack: 0.001,
      decay: open ? 0.3 : 0.08,
      sustain: 0,
      release: open ? 0.2 : 0.03,
    },
  });

  const highpass = new Tone.Filter(7000, 'highpass');
  const bandpass = new Tone.Filter(10000, 'bandpass', -12);

  noise.connect(highpass);
  highpass.connect(bandpass);
  bandpass.connect(output);

  // Boost volume for hi-hats
  noise.volume.value = open ? -3 : -6;

  return {
    trigger: (time, velocity = 1) => {
      const t = time ?? Tone.now();
      noise.triggerAttackRelease(open ? '8n' : '32n', t, velocity);
    },
    dispose: () => {
      noise.dispose();
      highpass.dispose();
      bandpass.dispose();
    },
  };
}

function createTom(output: Tone.ToneAudioNode, pitch: string): DrumVoice {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.03,
    octaves: 3,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
  }).connect(output);

  return {
    trigger: (time, velocity = 1) => synth.triggerAttackRelease(pitch, '8n', time, velocity),
    dispose: () => synth.dispose(),
  };
}

function createCymbal(output: Tone.ToneAudioNode, type: 'crash' | 'ride'): DrumVoice {
  // Use filtered noise for reliable cymbal sounds
  const noise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: {
      attack: 0.001,
      decay: type === 'crash' ? 1.2 : 0.5,
      sustain: type === 'crash' ? 0.1 : 0.05,
      release: type === 'crash' ? 0.8 : 0.3,
    },
  });

  const highpass = new Tone.Filter(5000, 'highpass');
  const bandpass = new Tone.Filter(type === 'crash' ? 8000 : 6000, 'bandpass', -12);

  noise.connect(highpass);
  highpass.connect(bandpass);
  bandpass.connect(output);

  // Good volume for cymbals
  noise.volume.value = type === 'crash' ? -3 : -6;

  return {
    trigger: (time, velocity = 1) => {
      const t = time ?? Tone.now();
      noise.triggerAttackRelease(type === 'crash' ? '2n' : '4n', t, velocity);
    },
    dispose: () => {
      noise.dispose();
      highpass.dispose();
      bandpass.dispose();
    },
  };
}

function createClap(output: Tone.ToneAudioNode): DrumVoice {
  const noise = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
  });
  const filter = new Tone.Filter(1500, 'bandpass').connect(output);
  noise.connect(filter);

  return {
    trigger: (time, velocity = 1) => noise.triggerAttackRelease('16n', time, velocity),
    dispose: () => {
      noise.dispose();
      filter.dispose();
    },
  };
}

function createRim(output: Tone.ToneAudioNode): DrumVoice {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.005,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
  }).connect(output);
  synth.volume.value = -5;

  return {
    trigger: (time, velocity = 1) => synth.triggerAttackRelease('G4', '32n', time, velocity),
    dispose: () => synth.dispose(),
  };
}

function createPercussion(output: Tone.ToneAudioNode, pitch: string): DrumVoice {
  const synth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.08 },
  }).connect(output);
  synth.volume.value = -3;

  return {
    trigger: (time, velocity = 1) => {
      const t = time ?? Tone.now();
      synth.triggerAttackRelease(pitch, '16n', t, velocity);
    },
    dispose: () => synth.dispose(),
  };
}

function createCowbell(output: Tone.ToneAudioNode): DrumVoice {
  // Two oscillators for cowbell sound
  const osc1 = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.08 },
  });

  const osc2 = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.06 },
  });

  const bandpass = new Tone.Filter(800, 'bandpass', -12).connect(output);
  osc1.connect(bandpass);
  osc2.connect(bandpass);

  osc1.volume.value = -6;
  osc2.volume.value = -8;

  return {
    trigger: (time, velocity = 1) => {
      const t = time ?? Tone.now();
      osc1.triggerAttackRelease('A5', '16n', t, velocity);
      osc2.triggerAttackRelease('E6', '16n', t, velocity * 0.8);
    },
    dispose: () => {
      osc1.dispose();
      osc2.dispose();
      bandpass.dispose();
    },
  };
}

export class DrumMachine extends InstrumentBase {
  type: 'drums' = 'drums';
  private voices: Map<number, DrumVoice> = new Map();
  private kit = '808';

  constructor(name = 'Drums') {
    super(name);
    this.initializeVoices();
  }

  private initializeVoices(): void {
    // Dispose existing voices
    for (const voice of this.voices.values()) {
      voice.dispose();
    }
    this.voices.clear();

    // Create voices for each pad
    this.voices.set(36, createKick(this.output));         // Kick
    this.voices.set(37, createRim(this.output));          // Rim
    this.voices.set(38, createSnare(this.output));        // Snare
    this.voices.set(39, createClap(this.output));         // Clap
    this.voices.set(40, createTom(this.output, 'G2'));    // Tom Low
    this.voices.set(41, createTom(this.output, 'C3'));    // Tom Mid
    this.voices.set(42, createHiHat(this.output, false)); // Closed HH
    this.voices.set(43, createHiHat(this.output, true));  // Open HH
    this.voices.set(44, createTom(this.output, 'E3'));    // Tom Hi
    this.voices.set(45, createCymbal(this.output, 'crash')); // Crash
    this.voices.set(46, createCymbal(this.output, 'ride')); // Ride
    this.voices.set(47, createPercussion(this.output, 'A4')); // Perc 1
    this.voices.set(48, createPercussion(this.output, 'B4')); // Perc 2
    this.voices.set(49, createPercussion(this.output, 'C5')); // Perc 3
    this.voices.set(50, createPercussion(this.output, 'D5')); // Perc 4
    this.voices.set(51, createCowbell(this.output)); // Cowbell
  }

  triggerAttack(note: string | number, time?: number, velocity = 1): void {
    const midiNote = typeof note === 'number' ? note : this.noteToMidi(note);
    const voice = this.voices.get(midiNote);
    if (voice) {
      const vel = velocity > 1 ? normalizeVelocity(velocity) : velocity;
      voice.trigger(time, vel);
    }
  }

  triggerRelease(_note: string | number, _time?: number): void {
    // Drums are one-shots, no release needed
  }

  triggerAttackRelease(
    note: string | number,
    _duration: number | string,
    time?: number,
    velocity = 1
  ): void {
    this.triggerAttack(note, time, velocity);
  }

  releaseAll(_time?: number): void {
    // Drums are one-shots, no release needed
  }

  // Trigger a pad by index (0-15)
  triggerPad(padIndex: number, time?: number, velocity = 1): void {
    if (padIndex >= 0 && padIndex < DRUM_PADS.length) {
      this.triggerAttack(DRUM_PADS[padIndex].note, time, velocity);
    }
  }

  private noteToMidi(note: string): number {
    // Simple conversion for drum notes
    const noteNum = parseInt(note);
    if (!isNaN(noteNum)) return noteNum;
    return Tone.Frequency(note).toMidi();
  }

  loadPreset(params: Record<string, unknown>): void {
    if (params.kit && typeof params.kit === 'string') {
      this.kit = params.kit;
      // In a full implementation, this would load different samples
      this.initializeVoices();
    }
  }

  getPreset(): Record<string, unknown> {
    return { kit: this.kit };
  }

  getPads(): typeof DRUM_PADS {
    return DRUM_PADS;
  }

  dispose(): void {
    for (const voice of this.voices.values()) {
      voice.dispose();
    }
    this.voices.clear();
    super.dispose();
  }
}

// Factory function
export function createDrumMachine(name?: string): DrumMachine {
  return new DrumMachine(name);
}
