import * as Tone from 'tone';
import { DJDeck, type DeckState } from './dj-deck';

export type CrossfaderCurve = 'linear' | 'constant' | 'smooth' | 'scratch';

export interface MixerState {
  crossfader: number;      // -1 (deck A) to 1 (deck B)
  crossfaderCurve: CrossfaderCurve;
  masterVolume: number;
  cueVolume: number;
  cueDeckA: boolean;
  cueDeckB: boolean;
  deckAState: DeckState | null;
  deckBState: DeckState | null;
}

/**
 * DJ Mixer
 * 2-channel mixer with crossfader, cue system, and master output
 */
export class DJMixer {
  public deckA: DJDeck;
  public deckB: DJDeck;

  private crossfaderGainA: Tone.Gain;
  private crossfaderGainB: Tone.Gain;
  private masterGain: Tone.Gain;
  private cueGain: Tone.Gain;
  private cueMixA: Tone.Gain;
  private cueMixB: Tone.Gain;

  private analyserMaster: Tone.Analyser;
  private analyserCue: Tone.Analyser;

  private state: MixerState = {
    crossfader: 0,
    crossfaderCurve: 'smooth',
    masterVolume: 1,
    cueVolume: 0.5,
    cueDeckA: false,
    cueDeckB: false,
    deckAState: null,
    deckBState: null,
  };

  private onStateChange: ((state: MixerState) => void) | null = null;

  constructor() {
    // Create decks
    this.deckA = new DJDeck();
    this.deckB = new DJDeck();

    // Crossfader gains
    this.crossfaderGainA = new Tone.Gain(1);
    this.crossfaderGainB = new Tone.Gain(0);

    // Master output
    this.masterGain = new Tone.Gain(1);

    // Cue (headphone) output
    this.cueGain = new Tone.Gain(0.5);
    this.cueMixA = new Tone.Gain(0);
    this.cueMixB = new Tone.Gain(0);

    // Analysers
    this.analyserMaster = new Tone.Analyser('waveform', 256);
    this.analyserCue = new Tone.Analyser('waveform', 256);

    // Connect decks to crossfader
    this.deckA.getOutput().connect(this.crossfaderGainA);
    this.deckB.getOutput().connect(this.crossfaderGainB);

    // Connect crossfader to master
    this.crossfaderGainA.connect(this.masterGain);
    this.crossfaderGainB.connect(this.masterGain);

    // Connect master to output and analyser
    this.masterGain.connect(Tone.getDestination());
    this.masterGain.connect(this.analyserMaster);

    // Connect cue system
    this.deckA.getOutput().connect(this.cueMixA);
    this.deckB.getOutput().connect(this.cueMixB);
    this.cueMixA.connect(this.cueGain);
    this.cueMixB.connect(this.cueGain);
    this.cueGain.connect(this.analyserCue);

    // Listen to deck state changes
    this.deckA.onState((state) => {
      this.state.deckAState = state;
      this.notifyStateChange();
    });

    this.deckB.onState((state) => {
      this.state.deckBState = state;
      this.notifyStateChange();
    });

    // Initialize crossfader
    this.setCrossfader(0);
  }

  /**
   * Set crossfader position (-1 to 1)
   */
  setCrossfader(position: number): void {
    this.state.crossfader = Math.max(-1, Math.min(1, position));

    const [gainA, gainB] = this.calculateCrossfaderGains(this.state.crossfader);

    this.crossfaderGainA.gain.value = gainA;
    this.crossfaderGainB.gain.value = gainB;

    this.notifyStateChange();
  }

  /**
   * Set crossfader curve type
   */
  setCrossfaderCurve(curve: CrossfaderCurve): void {
    this.state.crossfaderCurve = curve;
    // Recalculate gains with new curve
    this.setCrossfader(this.state.crossfader);
  }

  private calculateCrossfaderGains(position: number): [number, number] {
    // Position: -1 = full A, 0 = center, 1 = full B
    const normalized = (position + 1) / 2; // 0 to 1

    switch (this.state.crossfaderCurve) {
      case 'linear':
        return [1 - normalized, normalized];

      case 'constant':
        // Constant power (DJ standard)
        const angleA = (1 - normalized) * Math.PI / 2;
        const angleB = normalized * Math.PI / 2;
        return [Math.cos(angleB), Math.cos(angleA)];

      case 'smooth':
        // Smooth S-curve
        const smoothA = Math.cos(normalized * Math.PI / 2);
        const smoothB = Math.sin(normalized * Math.PI / 2);
        return [smoothA, smoothB];

      case 'scratch':
        // Sharp cut (for scratching)
        if (normalized < 0.1) return [1, 0];
        if (normalized > 0.9) return [0, 1];
        const midA = 1 - ((normalized - 0.1) / 0.8);
        const midB = (normalized - 0.1) / 0.8;
        return [midA, midB];

      default:
        return [1 - normalized, normalized];
    }
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.state.masterVolume = Math.max(0, Math.min(1.5, volume));
    this.masterGain.gain.value = this.state.masterVolume;
    this.notifyStateChange();
  }

  /**
   * Set cue/headphone volume
   */
  setCueVolume(volume: number): void {
    this.state.cueVolume = Math.max(0, Math.min(1, volume));
    this.cueGain.gain.value = this.state.cueVolume;
    this.notifyStateChange();
  }

  /**
   * Toggle deck A in cue
   */
  toggleCueDeckA(): void {
    this.state.cueDeckA = !this.state.cueDeckA;
    this.cueMixA.gain.value = this.state.cueDeckA ? 1 : 0;
    this.notifyStateChange();
  }

  /**
   * Toggle deck B in cue
   */
  toggleCueDeckB(): void {
    this.state.cueDeckB = !this.state.cueDeckB;
    this.cueMixB.gain.value = this.state.cueDeckB ? 1 : 0;
    this.notifyStateChange();
  }

  /**
   * Sync deck B to deck A's tempo
   */
  syncBtoA(): void {
    if (this.state.deckAState && this.state.deckBState) {
      const ratio = this.state.deckAState.bpm / this.state.deckBState.bpm;
      this.deckB.setTempo(ratio);
    }
  }

  /**
   * Sync deck A to deck B's tempo
   */
  syncAtoB(): void {
    if (this.state.deckAState && this.state.deckBState) {
      const ratio = this.state.deckBState.bpm / this.state.deckAState.bpm;
      this.deckA.setTempo(ratio);
    }
  }

  /**
   * Get master analyser for visualization
   */
  getMasterAnalyser(): Tone.Analyser {
    return this.analyserMaster;
  }

  /**
   * Get cue analyser for visualization
   */
  getCueAnalyser(): Tone.Analyser {
    return this.analyserCue;
  }

  /**
   * Get current mixer state
   */
  getState(): MixerState {
    return { ...this.state };
  }

  /**
   * Set state change callback
   */
  onMixerState(callback: (state: MixerState) => void): void {
    this.onStateChange = callback;
  }

  private notifyStateChange(): void {
    this.onStateChange?.(this.getState());
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.deckA.dispose();
    this.deckB.dispose();
    this.crossfaderGainA.dispose();
    this.crossfaderGainB.dispose();
    this.masterGain.dispose();
    this.cueGain.dispose();
    this.cueMixA.dispose();
    this.cueMixB.dispose();
    this.analyserMaster.dispose();
    this.analyserCue.dispose();
  }
}

// Export singleton for easy access
let mixerInstance: DJMixer | null = null;

export function getDJMixer(): DJMixer {
  if (!mixerInstance) {
    mixerInstance = new DJMixer();
  }
  return mixerInstance;
}

export function disposeDJMixer(): void {
  if (mixerInstance) {
    mixerInstance.dispose();
    mixerInstance = null;
  }
}
