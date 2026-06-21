import * as Tone from 'tone';
import type { DrumPattern, MelodicPattern, Pattern } from '../../stores/pattern-store';
import { isDrumPattern } from '../../stores/pattern-store';
import type { InstrumentPlayer } from '../clips/clip-scheduler';

interface LoopCallbacks {
  onBeat?: (beat: number, bar: number) => void;
  onBar?: (bar: number) => void;
  onStep?: (step: number) => void;
}

interface ActiveLoop {
  patternId: string;
  instrumentId: string;
  sequence: Tone.Sequence | Tone.Part | null;
  type: 'drum' | 'melodic';
}

class LoopEngine {
  private activeLoops: Map<string, ActiveLoop> = new Map();
  private instruments: Map<string, InstrumentPlayer> = new Map();
  private callbacks: LoopCallbacks = {};
  private isRunning = false;
  private currentBeat = 0;
  private currentBar = 0;
  private bpm = 120;
  private loopBars = 4;
  private beatCallback: number | null = null;
  private isInitialized = false;

  constructor() {
    // Don't set up beat tracking here - wait until audio context is ready
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      this.setupBeatTracking();
      this.isInitialized = true;
    }
  }

  private setupBeatTracking(): void {
    // Clear any existing callback
    if (this.beatCallback !== null) {
      Tone.getTransport().clear(this.beatCallback);
    }

    // Schedule a repeating callback for beat tracking
    this.beatCallback = Tone.getTransport().scheduleRepeat((time) => {
      const position = Tone.getTransport().position;
      const [bars, beats] = String(position).split(':').map(Number);

      this.currentBar = bars % this.loopBars;
      this.currentBeat = beats;

      // Use Tone.Draw for visual updates
      Tone.getDraw().schedule(() => {
        this.callbacks.onBeat?.(this.currentBeat, this.currentBar);

        if (this.currentBeat === 0) {
          this.callbacks.onBar?.(this.currentBar);
        }
      }, time);
    }, '4n');
  }

  // Register an instrument for playback
  registerInstrument(instrumentId: string, instrument: InstrumentPlayer): void {
    this.instruments.set(instrumentId, instrument);
  }

  // Unregister an instrument
  unregisterInstrument(instrumentId: string): void {
    // Stop any loops using this instrument first
    for (const [patternId, loop] of this.activeLoops) {
      if (loop.instrumentId === instrumentId) {
        this.stopPattern(patternId);
      }
    }
    this.instruments.delete(instrumentId);
  }

  // Store current pattern data for live updates
  private patternData: Map<string, DrumPattern> = new Map();

  // Update pattern data without restarting the sequence
  updatePatternData(patternId: string, pattern: DrumPattern): void {
    this.patternData.set(patternId, pattern);
  }

  // Start looping a drum pattern
  startDrumPattern(patternId: string, pattern: DrumPattern, instrumentId: string, drumMachine: any): void {
    // Stop existing loop for this pattern
    this.stopPattern(patternId);

    const instrument = this.instruments.get(instrumentId) || drumMachine;
    if (!instrument) {
      console.warn(`Instrument ${instrumentId} not found`);
      return;
    }

    // Store the initial pattern data
    this.patternData.set(patternId, pattern);

    const stepIndices = Array.from({ length: pattern.steps }, (_, i) => i);

    const sequence = new Tone.Sequence(
      (time, step) => {
        // Trigger step callback
        Tone.getDraw().schedule(() => {
          this.callbacks.onStep?.(step);
        }, time);

        // Get the CURRENT pattern data (not the captured one)
        const currentPattern = this.patternData.get(patternId);
        if (!currentPattern) return;

        // Trigger all active pads for this step
        for (let padIndex = 0; padIndex < 16; padIndex++) {
          if (currentPattern.grid[padIndex]?.[step]) {
            try {
              if (drumMachine?.triggerPad) {
                drumMachine.triggerPad(padIndex, time, 0.9);
              }
            } catch (e) {
              // Ignore errors from disposed instruments
            }
          }
        }
      },
      stepIndices,
      '16n'
    );

    sequence.loop = true;
    // Don't set loopEnd - let it default to playing all steps in the array
    // The sequence will automatically loop through all stepIndices
    sequence.start(0);

    this.activeLoops.set(patternId, {
      patternId,
      instrumentId,
      sequence,
      type: 'drum',
    });

    this.ensureTransportRunning();
  }

  // Start looping a melodic pattern
  startMelodicPattern(patternId: string, pattern: MelodicPattern, instrumentId: string): void {
    // Stop existing loop for this pattern
    this.stopPattern(patternId);

    const instrument = this.instruments.get(instrumentId);
    if (!instrument) {
      console.warn(`Instrument ${instrumentId} not found`);
      return;
    }

    // Create events for the Part
    const events = pattern.notes.map(note => ({
      time: `0:${note.start}`,
      pitch: note.pitch,
      duration: note.duration,
      velocity: note.velocity / 127,
    }));

    const part = new Tone.Part((time, event) => {
      try {
        instrument.triggerAttackRelease(
          Tone.Frequency(event.pitch, 'midi').toNote(),
          event.duration,
          time,
          event.velocity
        );
      } catch (e) {
        // Ignore errors from disposed instruments
      }
    }, events);

    part.loop = true;
    part.loopEnd = `${pattern.bars}m`; // Use proper time notation (e.g., "1m" for 1 measure)
    part.start(0);

    this.activeLoops.set(patternId, {
      patternId,
      instrumentId,
      sequence: part,
      type: 'melodic',
    });

    this.ensureTransportRunning();
  }

  // Start a pattern (auto-detect type)
  startPattern(patternId: string, pattern: Pattern, instrumentId: string, drumMachine?: any): void {
    if (isDrumPattern(pattern)) {
      this.startDrumPattern(patternId, pattern, instrumentId, drumMachine);
    } else {
      this.startMelodicPattern(patternId, pattern, instrumentId);
    }
  }

  // Stop a specific pattern
  stopPattern(patternId: string): void {
    const loop = this.activeLoops.get(patternId);
    if (loop?.sequence) {
      loop.sequence.stop();
      loop.sequence.dispose();
    }
    this.activeLoops.delete(patternId);

    // Stop transport if no more loops
    if (this.activeLoops.size === 0) {
      this.isRunning = false;
      try {
        Tone.getTransport().stop();
        Tone.getTransport().position = 0;
      } catch (e) {
        // Transport may not be ready
      }
    }
  }

  // Stop all patterns
  stopAll(): void {
    for (const patternId of this.activeLoops.keys()) {
      this.stopPattern(patternId);
    }
    try {
      Tone.getTransport().stop();
      Tone.getTransport().position = 0;
    } catch (e) {
      // Transport may not be ready
    }
    this.isRunning = false;
    this.currentBeat = 0;
    this.currentBar = 0;
  }

  // Check if a pattern is looping
  isLooping(patternId: string): boolean {
    return this.activeLoops.has(patternId);
  }

  // Get current beat position
  getCurrentBeat(): number {
    return this.currentBeat;
  }

  // Get current bar position
  getCurrentBar(): number {
    return this.currentBar;
  }

  // Get total step position (for sequencer playhead)
  getCurrentStep(): number {
    if (!this.isRunning) return 0;
    try {
      const position = Tone.getTransport().position;
      const parts = String(position).split(':').map(Number);
      if (parts.length < 3 || parts.some(isNaN)) return 0;
      const [bars, beats, sixteenths] = parts;
      return ((bars % this.loopBars) * 4 + beats) * 4 + Math.floor(sixteenths);
    } catch (e) {
      return 0;
    }
  }

  // Set BPM
  setBpm(bpm: number): void {
    this.bpm = Math.max(30, Math.min(300, bpm));
    Tone.getTransport().bpm.value = this.bpm;
  }

  // Get BPM
  getBpm(): number {
    return this.bpm;
  }

  // Set loop length in bars
  setLoopBars(bars: number): void {
    this.loopBars = Math.max(1, Math.min(16, bars));
    Tone.getTransport().loopEnd = `${this.loopBars}m`;
  }

  // Set callbacks
  setCallbacks(callbacks: LoopCallbacks): void {
    this.callbacks = callbacks;
  }

  // Check if running
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // Get active loop count
  getActiveLoopCount(): number {
    return this.activeLoops.size;
  }

  // Get all active pattern IDs
  getActivePatternIds(): string[] {
    return Array.from(this.activeLoops.keys());
  }

  private async ensureTransportRunning(): Promise<void> {
    if (!this.isRunning) {
      try {
        await Tone.start();
        if (Tone.getContext().state !== 'running') {
          await Tone.getContext().resume();
        }
        // Initialize beat tracking now that audio context is ready
        this.ensureInitialized();
        Tone.getTransport().bpm.value = this.bpm;
        Tone.getTransport().loop = true;
        Tone.getTransport().loopEnd = `${this.loopBars}m`;
        Tone.getTransport().start();
        this.isRunning = true;
      } catch (e) {
        console.warn('Failed to start transport:', e);
      }
    }
  }

  // Update a drum pattern while it's playing (for live editing)
  updateDrumPattern(patternId: string, pattern: DrumPattern, drumMachine: any): void {
    const loop = this.activeLoops.get(patternId);
    if (!loop || loop.type !== 'drum') return;

    // Store the current position
    const wasPlaying = this.isLooping(patternId);

    // Restart with new pattern
    if (wasPlaying) {
      this.startDrumPattern(patternId, pattern, loop.instrumentId, drumMachine);
    }
  }

  // Update a melodic pattern while it's playing
  updateMelodicPattern(patternId: string, pattern: MelodicPattern): void {
    const loop = this.activeLoops.get(patternId);
    if (!loop || loop.type !== 'melodic') return;

    const wasPlaying = this.isLooping(patternId);

    if (wasPlaying) {
      this.startMelodicPattern(patternId, pattern, loop.instrumentId);
    }
  }

  dispose(): void {
    this.stopAll();
    if (this.beatCallback !== null) {
      Tone.getTransport().clear(this.beatCallback);
      this.beatCallback = null;
    }
    this.instruments.clear();
  }
}

// Singleton instance
export const loopEngine = new LoopEngine();
