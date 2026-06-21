// Plays loop library entries as Tone.js patterns for preview (no timeline commitment).
import * as Tone from 'tone';
import type { LoopEntry } from '../data/loop-library';

const PAD_NOTES = [
  'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2', 'C3',
  'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4',
];

class LoopPreviewEngine {
  private synth: Tone.PolySynth | null = null;
  private drumSynth: Tone.MembraneSynth | null = null;
  private hatSynth: Tone.MetalSynth | null = null;
  private snareSynth: Tone.NoiseSynth | null = null;
  private loop: Tone.Part | null = null;
  private drumLoop: Tone.Sequence | null = null;
  private currentId: string | null = null;

  private ensureSynths() {
    if (!this.synth) {
      this.synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.8 },
      }).toDestination();
      this.synth.volume.value = -6;
    }
    if (!this.drumSynth) {
      this.drumSynth = new Tone.MembraneSynth({
        pitchDecay: 0.08, octaves: 4,
        envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 },
      }).toDestination();
      this.drumSynth.volume.value = -4;
    }
    if (!this.hatSynth) {
      this.hatSynth = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.06, release: 0.01 },
        harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
      }).toDestination();
      this.hatSynth.volume.value = -12;
    }
    if (!this.snareSynth) {
      this.snareSynth = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 },
      }).toDestination();
      this.snareSynth.volume.value = -8;
    }
  }

  private midiToNote(midi: number): string {
    const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    return notes[midi % 12] + Math.floor(midi / 12 - 1);
  }

  async preview(entry: LoopEntry) {
    await Tone.start();
    this.stop();
    this.ensureSynths();
    this.currentId = entry.id;

    const prevBpm = Tone.getTransport().bpm.value;
    Tone.getTransport().bpm.value = entry.bpm;

    if (entry.type === 'melodic' && entry.notes) {
      type NoteEvent = { time: string; note: string; duration: string; velocity: number };
      const beatsPerBar = 4;
      const totalBars = entry.bars;
      const events: NoteEvent[] = entry.notes.map(([midi, beat, dur, vel]) => ({
        time: `${Math.floor(beat / beatsPerBar)}:${(beat % beatsPerBar).toFixed(2)}`,
        note: this.midiToNote(midi),
        duration: `${dur * beatsPerBar}i`,
        velocity: (vel ?? 80) / 127,
      }));
      this.loop = new Tone.Part<NoteEvent>((time, ev) => {
        this.synth?.triggerAttackRelease(ev.note, ev.duration, time, ev.velocity);
      }, events);
      this.loop.loop = true;
      this.loop.loopEnd = `${totalBars}m`;
      this.loop.start(0);

    } else if (entry.type === 'drum' && entry.drumGrid) {
      const grid = entry.drumGrid;
      const steps = 16;
      // Build a flat sequence: each step checks all pads
      const stepEvents = Array.from({ length: steps }, (_, step) => step);

      this.drumLoop = new Tone.Sequence((time, step) => {
        for (let padIdx = 0; padIdx < grid.length; padIdx++) {
          if (!grid[padIdx][step]) continue;
          if (padIdx === 0) {
            this.drumSynth?.triggerAttackRelease('C1', '8n', time);
          } else if (padIdx === 1) {
            this.snareSynth?.triggerAttackRelease('8n', time);
          } else if (padIdx === 2 || padIdx === 3) {
            this.hatSynth?.triggerAttackRelease('16n', time);
          } else {
            // Additional percussion
            this.drumSynth?.triggerAttackRelease('G1', '16n', time, 0.4);
          }
        }
      }, stepEvents, '16n');

      this.drumLoop.loop = true;
      this.drumLoop.start(0);
    }

    if (Tone.getTransport().state !== 'started') {
      Tone.getTransport().start();
    }

    // Auto-stop after 8 bars
    const stopTime = `+${entry.bars * 2}m`;
    Tone.getTransport().scheduleOnce(() => {
      if (this.currentId === entry.id) this.stop();
      Tone.getTransport().bpm.value = prevBpm;
    }, stopTime);
  }

  stop() {
    this.loop?.stop();
    this.loop?.dispose();
    this.loop = null;
    this.drumLoop?.stop();
    this.drumLoop?.dispose();
    this.drumLoop = null;
    this.currentId = null;
  }

  dispose() {
    this.stop();
    this.synth?.dispose(); this.synth = null;
    this.drumSynth?.dispose(); this.drumSynth = null;
    this.hatSynth?.dispose(); this.hatSynth = null;
    this.snareSynth?.dispose(); this.snareSynth = null;
  }

  get playingId() { return this.currentId; }
}

export const loopPreviewEngine = new LoopPreviewEngine();
