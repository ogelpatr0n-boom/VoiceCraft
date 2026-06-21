import { create } from 'zustand';

export interface ProjectTrack {
  id: string;
  name: string;
  color: string;
  gain: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  hasBuffer: boolean;
  duration: number;
}

interface ProjectState {
  // Transport
  isPlaying: boolean;
  isRecording: boolean;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  loopStart: number;
  loopEnd: number;
  bpm: number;

  // Tracks
  tracks: ProjectTrack[];
  selectedTrackId: string | null;

  // File
  importedFileName: string | null;
  importedBuffer: AudioBuffer | null;
  processedBuffer: AudioBuffer | null;
  processingProgress: number;

  // Actions
  setIsPlaying: (v: boolean) => void;
  setIsRecording: (v: boolean) => void;
  setIsLooping: (v: boolean) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setLoopPoints: (start: number, end: number) => void;
  setBpm: (bpm: number) => void;

  addTrack: (track: ProjectTrack) => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<ProjectTrack>) => void;
  setSelectedTrackId: (id: string | null) => void;

  setImportedFile: (name: string, buffer: AudioBuffer) => void;
  setProcessedBuffer: (buffer: AudioBuffer | null) => void;
  setProcessingProgress: (p: number) => void;
  clearImport: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  isPlaying: false,
  isRecording: false,
  isLooping: false,
  currentTime: 0,
  duration: 0,
  loopStart: 0,
  loopEnd: 0,
  bpm: 120,

  tracks: [],
  selectedTrackId: null,

  importedFileName: null,
  importedBuffer: null,
  processedBuffer: null,
  processingProgress: 0,

  setIsPlaying: (v) => set({ isPlaying: v }),
  setIsRecording: (v) => set({ isRecording: v }),
  setIsLooping: (v) => set({ isLooping: v }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setLoopPoints: (start, end) => set({ loopStart: start, loopEnd: end }),
  setBpm: (bpm) => set({ bpm }),

  addTrack: (track) => set((s) => ({ tracks: [...s.tracks, track] })),
  removeTrack: (id) => set((s) => ({ tracks: s.tracks.filter(t => t.id !== id) })),
  updateTrack: (id, updates) => set((s) => ({
    tracks: s.tracks.map(t => t.id === id ? { ...t, ...updates } : t),
  })),
  setSelectedTrackId: (id) => set({ selectedTrackId: id }),

  setImportedFile: (name, buffer) => set({ importedFileName: name, importedBuffer: buffer }),
  setProcessedBuffer: (buffer) => set({ processedBuffer: buffer }),
  setProcessingProgress: (p) => set({ processingProgress: p }),
  clearImport: () => set({ importedFileName: null, importedBuffer: null, processedBuffer: null, processingProgress: 0 }),
}));
