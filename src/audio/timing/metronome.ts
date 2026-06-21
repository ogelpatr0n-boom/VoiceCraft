import * as Tone from 'tone';
import { transport } from './transport';

class MetronomeManager {
  private synth: Tone.MembraneSynth;
  private enabled = false;
  private volume = -6; // dB
  private scheduleId: number | null = null;
  private accentFirstBeat = true;

  constructor() {
    this.synth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0,
        release: 0.1,
      },
    }).toDestination();
    this.synth.volume.value = this.volume;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      this.start();
    } else {
      this.stop();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(db: number): void {
    this.volume = Math.max(-60, Math.min(0, db));
    this.synth.volume.value = this.volume;
  }

  getVolume(): number {
    return this.volume;
  }

  setAccentFirstBeat(accent: boolean): void {
    this.accentFirstBeat = accent;
  }

  private start(): void {
    if (this.scheduleId !== null) return;

    const timeSig = transport.getTimeSignature();
    let beatCount = 0;

    this.scheduleId = transport.scheduleRepeat((time) => {
      const isAccent = this.accentFirstBeat && beatCount % timeSig.numerator === 0;
      const note = isAccent ? 'C3' : 'C4';
      const velocity = isAccent ? 0.8 : 0.5;

      this.synth.triggerAttackRelease(note, '32n', time, velocity);
      beatCount++;
    }, '4n');
  }

  private stop(): void {
    if (this.scheduleId !== null) {
      transport.clearSchedule(this.scheduleId);
      this.scheduleId = null;
    }
  }

  dispose(): void {
    this.stop();
    this.synth.dispose();
  }
}

// Singleton instance
export const metronome = new MetronomeManager();
