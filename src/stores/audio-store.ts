import { create } from 'zustand';
import type { NoteName } from '../audio/music-theory';

export interface PitchDataPoint {
  time: number;
  midi: number;
  correctedMidi: number;
  targetMidi: number;
  clarity: number;
}

interface AudioState {
  // Engine state
  isRunning: boolean;
  isMicActive: boolean;
  isProcessing: boolean;

  // Pitch data
  currentFrequency: number;
  currentClarity: number;
  currentMidi: number;
  correctedMidi: number;
  targetMidi: number;
  shiftCents: number;
  pitchHistory: PitchDataPoint[];

  // Correction params
  key: NoteName;
  scale: string;
  retuneSpeed: number;
  humanize: number;
  correctionAmount: number;
  correctionEnabled: boolean;

  // Levels
  inputGain: number;
  outputGain: number;
  inputLevel: number;
  outputLevel: number;

  // Actions
  setIsRunning: (v: boolean) => void;
  setIsMicActive: (v: boolean) => void;
  setIsProcessing: (v: boolean) => void;
  updatePitch: (data: { freq: number; clarity: number; midi: number; correctedMidi: number; targetMidi: number; shiftCents: number }) => void;
  setKey: (key: NoteName) => void;
  setScale: (scale: string) => void;
  setRetuneSpeed: (ms: number) => void;
  setHumanize: (value: number) => void;
  setCorrectionAmount: (value: number) => void;
  setCorrectionEnabled: (v: boolean) => void;
  setInputGain: (v: number) => void;
  setOutputGain: (v: number) => void;
  setInputLevel: (v: number) => void;
  setOutputLevel: (v: number) => void;
  clearPitchHistory: () => void;
}

const MAX_HISTORY = 500;

export const useAudioStore = create<AudioState>((set) => ({
  isRunning: false,
  isMicActive: false,
  isProcessing: false,

  currentFrequency: 0,
  currentClarity: 0,
  currentMidi: 0,
  correctedMidi: 0,
  targetMidi: 0,
  shiftCents: 0,
  pitchHistory: [],

  key: 'C',
  scale: 'chromatic',
  retuneSpeed: 50,
  humanize: 0,
  correctionAmount: 100,
  correctionEnabled: true,

  inputGain: 1,
  outputGain: 1,
  inputLevel: 0,
  outputLevel: 0,

  setIsRunning: (v) => set({ isRunning: v }),
  setIsMicActive: (v) => set({ isMicActive: v }),
  setIsProcessing: (v) => set({ isProcessing: v }),

  updatePitch: (data) => set((state) => {
    const point: PitchDataPoint = {
      time: performance.now(),
      midi: data.midi,
      correctedMidi: data.correctedMidi,
      targetMidi: data.targetMidi,
      clarity: data.clarity,
    };
    const history = [...state.pitchHistory, point];
    if (history.length > MAX_HISTORY) history.shift();

    return {
      currentFrequency: data.freq,
      currentClarity: data.clarity,
      currentMidi: data.midi,
      correctedMidi: data.correctedMidi,
      targetMidi: data.targetMidi,
      shiftCents: data.shiftCents,
      pitchHistory: history,
    };
  }),

  setKey: (key) => set({ key }),
  setScale: (scale) => set({ scale }),
  setRetuneSpeed: (retuneSpeed) => set({ retuneSpeed }),
  setHumanize: (humanize) => set({ humanize }),
  setCorrectionAmount: (correctionAmount) => set({ correctionAmount }),
  setCorrectionEnabled: (correctionEnabled) => set({ correctionEnabled }),
  setInputGain: (inputGain) => set({ inputGain }),
  setOutputGain: (outputGain) => set({ outputGain }),
  setInputLevel: (inputLevel) => set({ inputLevel }),
  setOutputLevel: (outputLevel) => set({ outputLevel }),
  clearPitchHistory: () => set({ pitchHistory: [] }),
}));
