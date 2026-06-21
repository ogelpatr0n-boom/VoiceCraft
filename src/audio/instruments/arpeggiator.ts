import * as Tone from 'tone';
import { InstrumentBase, midiToToneNote, normalizeVelocity } from './instrument-base';

export type ArpPattern = 'up' | 'down' | 'updown' | 'downup' | 'random';
export type ArpDivision = '4n' | '8n' | '16n' | '32n' | '8t' | '16t';

export interface ArpeggiatorParams {
  pattern: ArpPattern;
  division: ArpDivision;
  octaves: number;
  gate: number; // 0-1, how long each note plays relative to division
  enabled: boolean;
}

export class Arpeggiator extends InstrumentBase {
  type: 'synth' = 'synth';
  private synth: Tone.PolySynth;
  private filter: Tone.Filter;
  private params: ArpeggiatorParams;
  private heldNotes: number[] = [];
  private arpSequence: Tone.Pattern<string> | null = null;
  private currentIndex = 0;

  constructor(name = 'Arpeggiator') {
    super(name);

    this.params = {
      pattern: 'up',
      division: '16n',
      octaves: 2,
      gate: 0.5,
      enabled: true,
    };

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.2,
      },
    });

    this.filter = new Tone.Filter({
      frequency: 3000,
      type: 'lowpass',
      rolloff: -12,
    });

    this.synth.connect(this.filter);
    this.filter.connect(this.output);
  }

  private getArpNotes(): string[] {
    if (this.heldNotes.length === 0) return [];

    const sortedNotes = [...this.heldNotes].sort((a, b) => a - b);
    const expandedNotes: string[] = [];

    // Expand across octaves
    for (let oct = 0; oct < this.params.octaves; oct++) {
      for (const note of sortedNotes) {
        expandedNotes.push(midiToToneNote(note + oct * 12));
      }
    }

    // Apply pattern
    switch (this.params.pattern) {
      case 'up':
        return expandedNotes;
      case 'down':
        return expandedNotes.reverse();
      case 'updown':
        return [...expandedNotes, ...expandedNotes.slice(1, -1).reverse()];
      case 'downup':
        const reversed = [...expandedNotes].reverse();
        return [...reversed, ...reversed.slice(1, -1).reverse()];
      case 'random':
        return expandedNotes.sort(() => Math.random() - 0.5);
      default:
        return expandedNotes;
    }
  }

  private startArpeggio(): void {
    this.stopArpeggio();

    const notes = this.getArpNotes();
    if (notes.length === 0) return;

    this.currentIndex = 0;

    this.arpSequence = new Tone.Pattern(
      (time, note) => {
        const duration = Tone.Time(this.params.division).toSeconds() * this.params.gate;
        this.synth.triggerAttackRelease(note, duration, time, 0.7);
      },
      notes,
      'up' // We handle pattern ourselves
    );

    this.arpSequence.interval = this.params.division;
    this.arpSequence.start(0);
  }

  private stopArpeggio(): void {
    if (this.arpSequence) {
      this.arpSequence.stop();
      this.arpSequence.dispose();
      this.arpSequence = null;
    }
  }

  private updateArpeggio(): void {
    if (this.heldNotes.length > 0 && this.params.enabled) {
      this.startArpeggio();
    } else {
      this.stopArpeggio();
    }
  }

  triggerAttack(note: string | number, time?: number, velocity = 1): void {
    const midiNote = typeof note === 'number' ? note : Tone.Frequency(note).toMidi();

    if (!this.heldNotes.includes(midiNote)) {
      this.heldNotes.push(midiNote);
      this.updateArpeggio();
    }
  }

  triggerRelease(note: string | number, time?: number): void {
    const midiNote = typeof note === 'number' ? note : Tone.Frequency(note).toMidi();

    const index = this.heldNotes.indexOf(midiNote);
    if (index > -1) {
      this.heldNotes.splice(index, 1);
      this.updateArpeggio();
    }
  }

  triggerAttackRelease(
    note: string | number,
    duration: number | string,
    time?: number,
    velocity = 1
  ): void {
    // For arpeggiator, just trigger attack - it will handle the pattern
    this.triggerAttack(note, time, velocity);

    // Schedule release
    const releaseTime = Tone.Time(time).toSeconds() + Tone.Time(duration).toSeconds();
    Tone.getTransport().scheduleOnce(() => {
      this.triggerRelease(note);
    }, releaseTime);
  }

  releaseAll(time?: number): void {
    this.heldNotes = [];
    this.stopArpeggio();
    this.synth.releaseAll(time);
  }

  // Parameter setters
  setPattern(pattern: ArpPattern): void {
    this.params.pattern = pattern;
    this.updateArpeggio();
  }

  setDivision(division: ArpDivision): void {
    this.params.division = division;
    if (this.arpSequence) {
      this.arpSequence.interval = division;
    }
  }

  setOctaves(octaves: number): void {
    this.params.octaves = Math.max(1, Math.min(4, octaves));
    this.updateArpeggio();
  }

  setGate(gate: number): void {
    this.params.gate = Math.max(0.1, Math.min(1, gate));
  }

  setEnabled(enabled: boolean): void {
    this.params.enabled = enabled;
    if (!enabled) {
      this.stopArpeggio();
    } else if (this.heldNotes.length > 0) {
      this.startArpeggio();
    }
  }

  loadPreset(params: Record<string, unknown>): void {
    const p = params as Partial<ArpeggiatorParams>;
    if (p.pattern) this.setPattern(p.pattern);
    if (p.division) this.setDivision(p.division);
    if (p.octaves !== undefined) this.setOctaves(p.octaves);
    if (p.gate !== undefined) this.setGate(p.gate);
    if (p.enabled !== undefined) this.setEnabled(p.enabled);
  }

  getPreset(): Record<string, unknown> {
    return { ...this.params };
  }

  getParams(): ArpeggiatorParams {
    return { ...this.params };
  }

  dispose(): void {
    this.stopArpeggio();
    this.synth.dispose();
    this.filter.dispose();
    super.dispose();
  }
}

export function createArpeggiator(name?: string): Arpeggiator {
  return new Arpeggiator(name);
}
