import { create } from 'zustand';

export type InstrumentType =
  | 'synth'
  | 'drums'
  | 'sampler'
  | 'bass'
  | 'fm'
  | 'arpeggiator'
  | 'plucked-string'
  | 'bowed-string'
  | 'pedal-steel';

export interface InstrumentPreset {
  id: string;
  name: string;
  type: InstrumentType;
  params: Record<string, unknown>;
}

export interface TrackFxParams {
  eqLow: number; eqMid: number; eqHigh: number;
  reverbWet: number; reverbDecay: number;
  delayWet: number; delayTime: number; delayFeedback: number;
  compThreshold: number; compRatio: number; compEnabled: boolean;
}

export const DEFAULT_FX: TrackFxParams = {
  eqLow: 0, eqMid: 0, eqHigh: 0,
  reverbWet: 0, reverbDecay: 2,
  delayWet: 0, delayTime: 0.25, delayFeedback: 0.3,
  compThreshold: -24, compRatio: 4, compEnabled: false,
};

export interface InstrumentData {
  id: string;
  name: string;
  type: InstrumentType;
  presetId: string | null;
  volume: number;  // dB
  pan: number;     // -1 to 1
  muted: boolean;
  solo: boolean;
  fx: TrackFxParams;
}

// Default synth presets
export const SYNTH_PRESETS: InstrumentPreset[] = [
  {
    id: 'synth-init',
    name: 'Init',
    type: 'synth',
    params: {
      oscillator: { type: 'sawtooth' },
      filter: { frequency: 2000, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
    },
  },
  {
    id: 'synth-pad',
    name: 'Warm Pad',
    type: 'synth',
    params: {
      oscillator: { type: 'sine' },
      filter: { frequency: 800, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.5, decay: 0.5, sustain: 0.8, release: 1.5 },
    },
  },
  {
    id: 'synth-lead',
    name: 'Lead',
    type: 'synth',
    params: {
      oscillator: { type: 'square' },
      filter: { frequency: 3000, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.2 },
    },
  },
  {
    id: 'synth-bass',
    name: 'Bass',
    type: 'synth',
    params: {
      oscillator: { type: 'sawtooth' },
      filter: { frequency: 400, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.2 },
    },
  },
  {
    id: 'synth-pluck',
    name: 'Pluck',
    type: 'synth',
    params: {
      oscillator: { type: 'triangle' },
      filter: { frequency: 4000, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
    },
  },
];

// Default drum presets
export const DRUM_PRESETS: InstrumentPreset[] = [
  {
    id: 'drums-808',
    name: '808 Kit',
    type: 'drums',
    params: { kit: '808' },
  },
  {
    id: 'drums-acoustic',
    name: 'Acoustic',
    type: 'drums',
    params: { kit: 'acoustic' },
  },
  {
    id: 'drums-electronic',
    name: 'Electronic',
    type: 'drums',
    params: { kit: 'electronic' },
  },
];

// Default sampler presets
export const SAMPLER_PRESETS: InstrumentPreset[] = [
  {
    id: 'sampler-piano',
    name: 'Piano',
    type: 'sampler',
    params: { instrument: 'piano' },
  },
  {
    id: 'sampler-strings',
    name: 'Strings',
    type: 'sampler',
    params: { instrument: 'strings' },
  },
];

// Bass synth presets (TB-303 style)
export const BASS_PRESETS: InstrumentPreset[] = [
  {
    id: 'bass-acid',
    name: 'Acid Bass',
    type: 'bass',
    params: {
      oscillator: { type: 'sawtooth' },
      filter: { frequency: 800, resonance: 15 },
      glide: 0.05,
    },
  },
  {
    id: 'bass-sub',
    name: 'Sub Bass',
    type: 'bass',
    params: {
      oscillator: { type: 'square' },
      filter: { frequency: 300, resonance: 5 },
      glide: 0,
    },
  },
  {
    id: 'bass-wobble',
    name: 'Wobble',
    type: 'bass',
    params: {
      oscillator: { type: 'sawtooth' },
      filter: { frequency: 1200, resonance: 20 },
      glide: 0.1,
    },
  },
];

// FM synth presets (DX7 style)
export const FM_PRESETS: InstrumentPreset[] = [
  {
    id: 'fm-epiano',
    name: 'E-Piano',
    type: 'fm',
    params: {
      harmonicity: 3.5,
      modulationIndex: 10,
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 0.5 },
    },
  },
  {
    id: 'fm-bell',
    name: 'Bell',
    type: 'fm',
    params: {
      harmonicity: 8,
      modulationIndex: 20,
      envelope: { attack: 0.001, decay: 1.5, sustain: 0, release: 0.5 },
    },
  },
  {
    id: 'fm-brass',
    name: 'Brass',
    type: 'fm',
    params: {
      harmonicity: 2,
      modulationIndex: 15,
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.3 },
    },
  },
  {
    id: 'fm-organ',
    name: 'Organ',
    type: 'fm',
    params: {
      harmonicity: 1,
      modulationIndex: 5,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.1 },
    },
  },
];

// Arpeggiator presets
export const ARP_PRESETS: InstrumentPreset[] = [
  {
    id: 'arp-up16',
    name: 'Up 16th',
    type: 'arpeggiator',
    params: { pattern: 'up', division: '16n', octaves: 2, gate: 0.5 },
  },
  {
    id: 'arp-down8',
    name: 'Down 8th',
    type: 'arpeggiator',
    params: { pattern: 'down', division: '8n', octaves: 2, gate: 0.7 },
  },
  {
    id: 'arp-updown',
    name: 'Up/Down',
    type: 'arpeggiator',
    params: { pattern: 'updown', division: '16n', octaves: 3, gate: 0.5 },
  },
  {
    id: 'arp-random',
    name: 'Random',
    type: 'arpeggiator',
    params: { pattern: 'random', division: '16n', octaves: 2, gate: 0.4 },
  },
];

// Plucked string presets (guitar, banjo, etc)
export const PLUCKED_PRESETS: InstrumentPreset[] = [
  {
    id: 'plucked-acoustic',
    name: 'Acoustic Guitar',
    type: 'plucked-string',
    params: { instrument: 'acoustic-guitar', resonance: 0.98, dampening: 3500 },
  },
  {
    id: 'plucked-electric',
    name: 'Electric Guitar',
    type: 'plucked-string',
    params: { instrument: 'electric-guitar', resonance: 0.95, dampening: 5000 },
  },
  {
    id: 'plucked-banjo',
    name: 'Banjo',
    type: 'plucked-string',
    params: { instrument: 'banjo', resonance: 0.9, dampening: 2000 },
  },
  {
    id: 'plucked-mandolin',
    name: 'Mandolin',
    type: 'plucked-string',
    params: { instrument: 'mandolin', resonance: 0.92, dampening: 3000 },
  },
  {
    id: 'plucked-ukulele',
    name: 'Ukulele',
    type: 'plucked-string',
    params: { instrument: 'ukulele', resonance: 0.94, dampening: 4000 },
  },
  {
    id: 'plucked-harp',
    name: 'Harp',
    type: 'plucked-string',
    params: { instrument: 'harp', resonance: 0.99, dampening: 6000 },
  },
];

// Bowed string presets (violin, fiddle, etc)
export const BOWED_PRESETS: InstrumentPreset[] = [
  {
    id: 'bowed-fiddle',
    name: 'Country Fiddle',
    type: 'bowed-string',
    params: { vibrato: { frequency: 6, depth: 0.15 } },
  },
  {
    id: 'bowed-violin',
    name: 'Violin',
    type: 'bowed-string',
    params: { vibrato: { frequency: 5, depth: 0.1 } },
  },
  {
    id: 'bowed-viola',
    name: 'Viola',
    type: 'bowed-string',
    params: { vibrato: { frequency: 4.5, depth: 0.08 } },
  },
  {
    id: 'bowed-cello',
    name: 'Cello',
    type: 'bowed-string',
    params: { vibrato: { frequency: 4, depth: 0.1 } },
  },
];

// Pedal steel presets
export const PEDAL_STEEL_PRESETS: InstrumentPreset[] = [
  {
    id: 'pedal-classic',
    name: 'Classic Country',
    type: 'pedal-steel',
    params: {},
  },
];

interface InstrumentState {
  instruments: InstrumentData[];
  selectedInstrumentId: string | null;
  presets: InstrumentPreset[];

  // Actions
  addInstrument: (type: InstrumentType, name?: string) => string;
  removeInstrument: (id: string) => void;
  updateInstrument: (id: string, updates: Partial<InstrumentData>) => void;
  updateInstrumentFx: (id: string, fxUpdates: Partial<TrackFxParams>) => void;
  setSelectedInstrumentId: (id: string | null) => void;
  setInstrumentPreset: (instrumentId: string, presetId: string) => void;
  getInstrument: (id: string) => InstrumentData | undefined;
  getPreset: (presetId: string) => InstrumentPreset | undefined;
  getPresetsForType: (type: InstrumentType) => InstrumentPreset[];
}

const TRACK_COLORS = [
  '#00d4ff', // cyan
  '#ff6b35', // orange
  '#4ecdc4', // teal
  '#f7dc6f', // yellow
  '#bb8fce', // purple
  '#58d68d', // green
  '#ec7063', // red
  '#5dade2', // blue
];

export const useInstrumentStore = create<InstrumentState>((set, get) => ({
  instruments: [],
  selectedInstrumentId: null,
  presets: [
    ...SYNTH_PRESETS,
    ...DRUM_PRESETS,
    ...SAMPLER_PRESETS,
    ...BASS_PRESETS,
    ...FM_PRESETS,
    ...ARP_PRESETS,
    ...PLUCKED_PRESETS,
    ...BOWED_PRESETS,
    ...PEDAL_STEEL_PRESETS,
  ],

  addInstrument: (type, name) => {
    const id = crypto.randomUUID();
    const instrumentCount = get().instruments.length;
    const typeNames: Record<InstrumentType, string> = {
      synth: 'Synth',
      drums: 'Drums',
      sampler: 'Sampler',
      bass: 'Bass',
      fm: 'FM Synth',
      arpeggiator: 'Arpeggiator',
      'plucked-string': 'Guitar',
      'bowed-string': 'Fiddle',
      'pedal-steel': 'Pedal Steel',
    };
    const defaultName = name ?? `${typeNames[type]} ${instrumentCount + 1}`;

    const defaultPresets: Record<InstrumentType, string> = {
      synth: 'synth-init',
      drums: 'drums-808',
      sampler: 'sampler-piano',
      bass: 'bass-acid',
      fm: 'fm-epiano',
      arpeggiator: 'arp-up16',
      'plucked-string': 'plucked-acoustic',
      'bowed-string': 'bowed-fiddle',
      'pedal-steel': 'pedal-classic',
    };

    const instrument: InstrumentData = {
      id,
      name: defaultName,
      type,
      presetId: defaultPresets[type],
      volume: 0,
      pan: 0,
      muted: false,
      solo: false,
      fx: { ...DEFAULT_FX },
    };

    set((s) => ({
      instruments: [...s.instruments, instrument],
      selectedInstrumentId: id,
    }));

    return id;
  },

  removeInstrument: (id) => {
    set((s) => ({
      instruments: s.instruments.filter((i) => i.id !== id),
      selectedInstrumentId: s.selectedInstrumentId === id ? null : s.selectedInstrumentId,
    }));
  },

  updateInstrument: (id, updates) => {
    set((s) => ({
      instruments: s.instruments.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
    }));
  },

  updateInstrumentFx: (id, fxUpdates) => {
    set((s) => ({
      instruments: s.instruments.map((i) =>
        i.id === id ? { ...i, fx: { ...i.fx, ...fxUpdates } } : i
      ),
    }));
  },

  setSelectedInstrumentId: (id) => {
    set({ selectedInstrumentId: id });
  },

  setInstrumentPreset: (instrumentId, presetId) => {
    set((s) => ({
      instruments: s.instruments.map((i) =>
        i.id === instrumentId ? { ...i, presetId } : i
      ),
    }));
  },

  getInstrument: (id) => {
    return get().instruments.find((i) => i.id === id);
  },

  getPreset: (presetId) => {
    return get().presets.find((p) => p.id === presetId);
  },

  getPresetsForType: (type) => {
    return get().presets.filter((p) => p.type === type);
  },
}));
