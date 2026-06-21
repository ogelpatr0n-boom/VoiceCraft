import * as Tone from 'tone';
import type { TimelineClip } from '../stores/timeline-store';
import type { InstrumentData } from '../stores/instrument-store';

type TriggerFn = (note: string, duration: string, time: number, velocity: number) => void;

interface RegisteredInstrument {
  trigger: TriggerFn;
}

class ArrangementEngine {
  private instruments: Map<string, RegisteredInstrument> = new Map();
  private scheduledParts: Tone.Part[] = [];
  private scheduledBuffers: Tone.Player[] = [];
  private audioBuffers: Map<string, AudioBuffer> = new Map();

  registerInstrument(instrumentId: string, trigger: TriggerFn): void {
    this.instruments.set(instrumentId, { trigger });
  }

  unregisterInstrument(instrumentId: string): void {
    this.instruments.delete(instrumentId);
  }

  registerAudioBuffer(bufferId: string, buffer: AudioBuffer): void {
    this.audioBuffers.set(bufferId, buffer);
  }

  scheduleClips(clips: TimelineClip[], instruments: InstrumentData[], bpm: number): void {
    this.clearScheduled();

    for (const clip of clips) {
      if (clip.type === 'midi' && clip.notes && clip.notes.length > 0 && clip.instrumentId) {
        this.scheduleMidiClip(clip, bpm);
      }
      // Audio clips scheduled separately when buffer support is added
    }
  }

  private scheduleMidiClip(clip: TimelineClip, bpm: number): void {
    const instrument = this.instruments.get(clip.instrumentId!);
    if (!instrument) return;

    const beatsToSeconds = (beats: number) => (beats * 60) / bpm;
    const startTime = beatsToSeconds(clip.startBeat);

    const events = (clip.notes ?? []).map(note => ({
      time: startTime + beatsToSeconds(note.start),
      pitch: note.pitch,
      duration: beatsToSeconds(note.duration),
      velocity: note.velocity / 127,
    }));

    if (events.length === 0) return;

    const part = new Tone.Part((time, event) => {
      try {
        instrument.trigger(
          Tone.Frequency(event.pitch, 'midi').toNote(),
          event.duration + 's',
          time,
          event.velocity
        );
      } catch {
        // instrument disposed
      }
    }, events);

    part.start(0);
    this.scheduledParts.push(part);
  }

  clearScheduled(): void {
    for (const part of this.scheduledParts) {
      try { part.stop(); part.dispose(); } catch { /* disposed */ }
    }
    this.scheduledParts = [];

    for (const player of this.scheduledBuffers) {
      try { player.stop(); player.dispose(); } catch { /* disposed */ }
    }
    this.scheduledBuffers = [];
  }

  dispose(): void {
    this.clearScheduled();
    this.instruments.clear();
    this.audioBuffers.clear();
  }
}

export const arrangementEngine = new ArrangementEngine();
