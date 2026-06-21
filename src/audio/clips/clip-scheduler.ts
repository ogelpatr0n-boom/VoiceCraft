import * as Tone from 'tone';
import { transport } from '../timing/transport';
import { beatsToSeconds } from '../timing/time-utils';
import { MidiClip } from './midi-clip';
import { AudioClip } from './audio-clip';
import type { MidiNote } from '../midi/midi-event';

export interface ScheduledClip {
  id: string;
  clipId: string;
  trackId: string;
  startBeat: number;
  type: 'audio' | 'midi';
}

export interface InstrumentPlayer {
  triggerAttack: (note: string | number, time: number, velocity?: number) => void;
  triggerRelease: (note: string | number, time: number) => void;
  triggerAttackRelease: (note: string | number, duration: number | string, time: number, velocity?: number) => void;
}

class ClipScheduler {
  private scheduledEvents: Map<string, number[]> = new Map(); // clipId -> event IDs
  private audioPlayers: Map<string, Tone.Player> = new Map();
  private instruments: Map<string, InstrumentPlayer> = new Map();

  // Register an instrument for MIDI playback
  registerInstrument(instrumentId: string, instrument: InstrumentPlayer): void {
    this.instruments.set(instrumentId, instrument);
  }

  // Unregister an instrument
  unregisterInstrument(instrumentId: string): void {
    this.instruments.delete(instrumentId);
  }

  // Schedule a MIDI clip for playback
  scheduleMidiClip(
    clip: MidiClip,
    trackId: string,
    startBeat: number,
    instrumentId: string
  ): string {
    const scheduleId = crypto.randomUUID();
    const instrument = this.instruments.get(instrumentId);

    if (!instrument) {
      console.warn(`Instrument ${instrumentId} not found`);
      return scheduleId;
    }

    const eventIds: number[] = [];
    const bpm = transport.getBpm();

    for (const note of clip.notes) {
      const absoluteStartBeat = startBeat + note.start;
      const startSeconds = beatsToSeconds(absoluteStartBeat, bpm);
      const durationSeconds = beatsToSeconds(note.duration, bpm);
      const velocity = note.velocity / 127;

      // Schedule note on/off
      const eventId = Tone.getTransport().schedule((time) => {
        instrument.triggerAttackRelease(
          Tone.Frequency(note.pitch, 'midi').toNote(),
          durationSeconds,
          time,
          velocity
        );
      }, startSeconds);

      eventIds.push(eventId);
    }

    this.scheduledEvents.set(scheduleId, eventIds);
    return scheduleId;
  }

  // Schedule individual MIDI notes (for real-time recording)
  scheduleNote(
    note: MidiNote,
    instrumentId: string,
    offsetBeat = 0
  ): void {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) return;

    const bpm = transport.getBpm();
    const startSeconds = beatsToSeconds(note.start + offsetBeat, bpm);
    const durationSeconds = beatsToSeconds(note.duration, bpm);
    const velocity = note.velocity / 127;

    Tone.getTransport().schedule((time) => {
      instrument.triggerAttackRelease(
        Tone.Frequency(note.pitch, 'midi').toNote(),
        durationSeconds,
        time,
        velocity
      );
    }, startSeconds);
  }

  // Schedule an audio clip for playback
  scheduleAudioClip(
    clip: AudioClip,
    trackId: string,
    startBeat: number,
    destination: Tone.ToneAudioNode = Tone.getDestination()
  ): string {
    const scheduleId = crypto.randomUUID();
    const bpm = transport.getBpm();
    const startSeconds = beatsToSeconds(startBeat, bpm);

    // Create a player for this clip
    const player = new Tone.Player(clip.buffer).connect(destination);
    player.volume.value = Tone.gainToDb(clip.gain);

    // Set up fades
    if (clip.fadeIn > 0) {
      player.fadeIn = clip.fadeIn;
    }
    if (clip.fadeOut > 0) {
      player.fadeOut = clip.fadeOut;
    }

    this.audioPlayers.set(scheduleId, player);

    // Schedule playback
    const eventId = Tone.getTransport().schedule((time) => {
      player.start(time, clip.trimStart, clip.getDuration());
    }, startSeconds);

    this.scheduledEvents.set(scheduleId, [eventId]);
    return scheduleId;
  }

  // Unschedule a clip
  unscheduleClip(scheduleId: string): void {
    const eventIds = this.scheduledEvents.get(scheduleId);
    if (eventIds) {
      for (const eventId of eventIds) {
        Tone.getTransport().clear(eventId);
      }
      this.scheduledEvents.delete(scheduleId);
    }

    const player = this.audioPlayers.get(scheduleId);
    if (player) {
      player.stop();
      player.dispose();
      this.audioPlayers.delete(scheduleId);
    }
  }

  // Unschedule all clips
  unscheduleAll(): void {
    for (const scheduleId of this.scheduledEvents.keys()) {
      this.unscheduleClip(scheduleId);
    }
  }

  // Reschedule all clips (e.g., after BPM change)
  rescheduleAll(clips: Map<string, { clip: MidiClip | AudioClip; startBeat: number; trackId: string; instrumentId?: string }>): void {
    this.unscheduleAll();

    for (const [id, { clip, startBeat, trackId, instrumentId }] of clips) {
      if (clip instanceof MidiClip && instrumentId) {
        this.scheduleMidiClip(clip, trackId, startBeat, instrumentId);
      } else if (clip instanceof AudioClip) {
        this.scheduleAudioClip(clip, trackId, startBeat);
      }
    }
  }

  dispose(): void {
    this.unscheduleAll();
    this.instruments.clear();
  }
}

// Singleton instance
export const clipScheduler = new ClipScheduler();
