import { create } from 'zustand';

interface EffectParams {
  bypass: boolean;
}

interface CompressorParams extends EffectParams {
  threshold: number;
  knee: number;
  ratio: number;
  attack: number;
  release: number;
  makeupGain: number;
}

interface EQParams extends EffectParams {
  low: number;
  mid: number;
  high: number;
}

interface ChorusParams extends EffectParams {
  rate: number;
  depth: number;
  mix: number;
}

interface DelayParams extends EffectParams {
  time: number;
  feedback: number;
  mix: number;
}

interface ReverbParams extends EffectParams {
  decay: number;
  mix: number;
}

interface EffectsState {
  compressor: CompressorParams;
  eq: EQParams;
  chorus: ChorusParams;
  delay: DelayParams;
  reverb: ReverbParams;

  setCompressor: (p: Partial<CompressorParams>) => void;
  setEQ: (p: Partial<EQParams>) => void;
  setChorus: (p: Partial<ChorusParams>) => void;
  setDelay: (p: Partial<DelayParams>) => void;
  setReverb: (p: Partial<ReverbParams>) => void;
}

export const useEffectsStore = create<EffectsState>((set) => ({
  compressor: {
    bypass: true,
    threshold: -24,
    knee: 12,
    ratio: 4,
    attack: 0.003,
    release: 0.25,
    makeupGain: 1,
  },
  eq: {
    bypass: true,
    low: 0,
    mid: 0,
    high: 0,
  },
  chorus: {
    bypass: true,
    rate: 0.7,
    depth: 0.5,
    mix: 0.3,
  },
  delay: {
    bypass: true,
    time: 0.3,
    feedback: 0.3,
    mix: 0.3,
  },
  reverb: {
    bypass: true,
    decay: 2,
    mix: 0.3,
  },

  setCompressor: (p) => set((s) => ({ compressor: { ...s.compressor, ...p } })),
  setEQ: (p) => set((s) => ({ eq: { ...s.eq, ...p } })),
  setChorus: (p) => set((s) => ({ chorus: { ...s.chorus, ...p } })),
  setDelay: (p) => set((s) => ({ delay: { ...s.delay, ...p } })),
  setReverb: (p) => set((s) => ({ reverb: { ...s.reverb, ...p } })),
}));
