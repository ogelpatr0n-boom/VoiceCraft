import { create } from 'zustand';
import type { MidiNote } from '../audio/midi/midi-event';

export interface DrumPattern {
  id: string;
  name: string;
  instrumentId: string;
  steps: number;       // 16 default
  bars: number;        // 1, 2, 4, 8
  grid: boolean[][];   // [padIndex][step]
  isLooping: boolean;
}

export interface MelodicPattern {
  id: string;
  name: string;
  instrumentId: string;
  bars: number;
  notes: MidiNote[];
  isLooping: boolean;
}

export type Pattern = DrumPattern | MelodicPattern;

export function isDrumPattern(pattern: Pattern): pattern is DrumPattern {
  return 'grid' in pattern;
}

export function isMelodicPattern(pattern: Pattern): pattern is MelodicPattern {
  return 'notes' in pattern;
}

interface PatternState {
  // All patterns indexed by ID
  patterns: Map<string, Pattern>;

  // Currently active pattern per instrument
  activePatternIds: Map<string, string>;

  // Global loop settings
  globalBpm: number;
  globalBars: number;

  // Pattern CRUD
  createDrumPattern: (instrumentId: string, name?: string) => string;
  createMelodicPattern: (instrumentId: string, name?: string) => string;
  deletePattern: (patternId: string) => void;
  duplicatePattern: (patternId: string) => string | null;

  // Drum pattern editing
  updateDrumStep: (patternId: string, padIndex: number, step: number, value: boolean) => void;
  setDrumGrid: (patternId: string, grid: boolean[][]) => void;
  clearDrumPattern: (patternId: string) => void;
  randomizeDrumPattern: (patternId: string) => void;

  // Melodic pattern editing
  addNote: (patternId: string, note: MidiNote) => void;
  updateNote: (patternId: string, noteId: string, updates: Partial<MidiNote>) => void;
  removeNote: (patternId: string, noteId: string) => void;
  clearMelodicPattern: (patternId: string) => void;

  // Pattern settings
  setPatternName: (patternId: string, name: string) => void;
  setPatternBars: (patternId: string, bars: number) => void;
  setPatternSteps: (patternId: string, steps: number) => void;

  // Loop control
  setLooping: (patternId: string, isLooping: boolean) => void;
  stopAllLoops: () => void;
  getLoopingPatterns: () => Pattern[];

  // Active pattern management
  setActivePattern: (instrumentId: string, patternId: string) => void;
  getActivePattern: (instrumentId: string) => Pattern | undefined;

  // Global settings
  setGlobalBpm: (bpm: number) => void;
  setGlobalBars: (bars: number) => void;

  // Getters
  getPattern: (patternId: string) => Pattern | undefined;
  getPatternsForInstrument: (instrumentId: string) => Pattern[];
}

export const usePatternStore = create<PatternState>((set, get) => ({
  patterns: new Map(),
  activePatternIds: new Map(),
  globalBpm: 120,
  globalBars: 4,

  createDrumPattern: (instrumentId, name) => {
    const id = crypto.randomUUID();
    const patternCount = get().getPatternsForInstrument(instrumentId).length;
    const patternName = name ?? `Pattern ${patternCount + 1}`;
    const steps = 16;

    const pattern: DrumPattern = {
      id,
      name: patternName,
      instrumentId,
      steps,
      bars: 1,
      grid: Array(16).fill(null).map(() => Array(steps).fill(false)),
      isLooping: false,
    };

    set((state) => {
      const newPatterns = new Map(state.patterns);
      newPatterns.set(id, pattern);

      // Auto-set as active if no active pattern
      const newActiveIds = new Map(state.activePatternIds);
      if (!newActiveIds.has(instrumentId)) {
        newActiveIds.set(instrumentId, id);
      }

      return { patterns: newPatterns, activePatternIds: newActiveIds };
    });

    return id;
  },

  createMelodicPattern: (instrumentId, name) => {
    const id = crypto.randomUUID();
    const patternCount = get().getPatternsForInstrument(instrumentId).length;
    const patternName = name ?? `Pattern ${patternCount + 1}`;

    const pattern: MelodicPattern = {
      id,
      name: patternName,
      instrumentId,
      bars: 1,
      notes: [],
      isLooping: false,
    };

    set((state) => {
      const newPatterns = new Map(state.patterns);
      newPatterns.set(id, pattern);

      const newActiveIds = new Map(state.activePatternIds);
      if (!newActiveIds.has(instrumentId)) {
        newActiveIds.set(instrumentId, id);
      }

      return { patterns: newPatterns, activePatternIds: newActiveIds };
    });

    return id;
  },

  deletePattern: (patternId) => {
    set((state) => {
      const pattern = state.patterns.get(patternId);
      if (!pattern) return state;

      const newPatterns = new Map(state.patterns);
      newPatterns.delete(patternId);

      const newActiveIds = new Map(state.activePatternIds);
      if (newActiveIds.get(pattern.instrumentId) === patternId) {
        // Find another pattern for this instrument
        const otherPattern = Array.from(newPatterns.values())
          .find(p => p.instrumentId === pattern.instrumentId);
        if (otherPattern) {
          newActiveIds.set(pattern.instrumentId, otherPattern.id);
        } else {
          newActiveIds.delete(pattern.instrumentId);
        }
      }

      return { patterns: newPatterns, activePatternIds: newActiveIds };
    });
  },

  duplicatePattern: (patternId) => {
    const pattern = get().patterns.get(patternId);
    if (!pattern) return null;

    const newId = crypto.randomUUID();
    const newPattern: Pattern = {
      ...pattern,
      id: newId,
      name: `${pattern.name} (copy)`,
      isLooping: false,
    };

    if (isMelodicPattern(pattern) && isMelodicPattern(newPattern)) {
      newPattern.notes = pattern.notes.map(note => ({
        ...note,
        id: crypto.randomUUID(),
      }));
    }

    if (isDrumPattern(pattern) && isDrumPattern(newPattern)) {
      newPattern.grid = pattern.grid.map(row => [...row]);
    }

    set((state) => {
      const newPatterns = new Map(state.patterns);
      newPatterns.set(newId, newPattern);
      return { patterns: newPatterns };
    });

    return newId;
  },

  updateDrumStep: (patternId, padIndex, step, value) => {
    set((state) => {
      const pattern = state.patterns.get(patternId);
      if (!pattern || !isDrumPattern(pattern)) return state;

      const newGrid = pattern.grid.map(row => [...row]);
      if (newGrid[padIndex] && step < newGrid[padIndex].length) {
        newGrid[padIndex][step] = value;
      }

      const newPatterns = new Map(state.patterns);
      newPatterns.set(patternId, { ...pattern, grid: newGrid });
      return { patterns: newPatterns };
    });
  },

  setDrumGrid: (patternId, grid) => {
    set((state) => {
      const pattern = state.patterns.get(patternId);
      if (!pattern || !isDrumPattern(pattern)) return state;

      const newPatterns = new Map(state.patterns);
      newPatterns.set(patternId, { ...pattern, grid });
      return { patterns: newPatterns };
    });
  },

  clearDrumPattern: (patternId) => {
    set((state) => {
      const pattern = state.patterns.get(patternId);
      if (!pattern || !isDrumPattern(pattern)) return state;

      const newGrid = pattern.grid.map(row => row.map(() => false));
      const newPatterns = new Map(state.patterns);
      newPatterns.set(patternId, { ...pattern, grid: newGrid });
      return { patterns: newPatterns };
    });
  },

  randomizeDrumPattern: (patternId) => {
    set((state) => {
      const pattern = state.patterns.get(patternId);
      if (!pattern || !isDrumPattern(pattern)) return state;

      const newGrid = pattern.grid.map((row, padIndex) => {
        // Different probability for different drums
        const probability = padIndex < 4 ? 0.3 : padIndex < 8 ? 0.15 : 0.1;
        return row.map(() => Math.random() < probability);
      });

      const newPatterns = new Map(state.patterns);
      newPatterns.set(patternId, { ...pattern, grid: newGrid });
      return { patterns: newPatterns };
    });
  },

  addNote: (patternId, note) => {
    set((state) => {
      const pattern = state.patterns.get(patternId);
      if (!pattern || !isMelodicPattern(pattern)) return state;

      const newPatterns = new Map(state.patterns);
      newPatterns.set(patternId, {
        ...pattern,
        notes: [...pattern.notes, note],
      });
      return { patterns: newPatterns };
    });
  },

  updateNote: (patternId, noteId, updates) => {
    set((state) => {
      const pattern = state.patterns.get(patternId);
      if (!pattern || !isMelodicPattern(pattern)) return state;

      const newNotes = pattern.notes.map(note =>
        note.id === noteId ? { ...note, ...updates } : note
      );

      const newPatterns = new Map(state.patterns);
      newPatterns.set(patternId, { ...pattern, notes: newNotes });
      return { patterns: newPatterns };
    });
  },

  removeNote: (patternId, noteId) => {
    set((state) => {
      const pattern = state.patterns.get(patternId);
      if (!pattern || !isMelodicPattern(pattern)) return state;

      const newNotes = pattern.notes.filter(note => note.id !== noteId);
      const newPatterns = new Map(state.patterns);
      newPatterns.set(patternId, { ...pattern, notes: newNotes });
      return { patterns: newPatterns };
    });
  },

  clearMelodicPattern: (patternId) => {
    set((state) => {
      const pattern = state.patterns.get(patternId);
      if (!pattern || !isMelodicPattern(pattern)) return state;

      const newPatterns = new Map(state.patterns);
      newPatterns.set(patternId, { ...pattern, notes: [] });
      return { patterns: newPatterns };
    });
  },

  setPatternName: (patternId, name) => {
    set((state) => {
      const pattern = state.patterns.get(patternId);
      if (!pattern) return state;

      const newPatterns = new Map(state.patterns);
      newPatterns.set(patternId, { ...pattern, name });
      return { patterns: newPatterns };
    });
  },

  setPatternBars: (patternId, bars) => {
    set((state) => {
      const pattern = state.patterns.get(patternId);
      if (!pattern) return state;

      const newPatterns = new Map(state.patterns);

      if (isDrumPattern(pattern)) {
        // Resize grid when bars change
        const newSteps = bars * 16;
        const newGrid = pattern.grid.map(row => {
          if (newSteps > row.length) {
            return [...row, ...Array(newSteps - row.length).fill(false)];
          }
          return row.slice(0, newSteps);
        });
        newPatterns.set(patternId, { ...pattern, bars, steps: newSteps, grid: newGrid });
      } else {
        newPatterns.set(patternId, { ...pattern, bars });
      }

      return { patterns: newPatterns };
    });
  },

  setPatternSteps: (patternId, steps) => {
    set((state) => {
      const pattern = state.patterns.get(patternId);
      if (!pattern || !isDrumPattern(pattern)) return state;

      const newGrid = pattern.grid.map(row => {
        if (steps > row.length) {
          return [...row, ...Array(steps - row.length).fill(false)];
        }
        return row.slice(0, steps);
      });

      const newPatterns = new Map(state.patterns);
      newPatterns.set(patternId, { ...pattern, steps, grid: newGrid });
      return { patterns: newPatterns };
    });
  },

  setLooping: (patternId, isLooping) => {
    set((state) => {
      const pattern = state.patterns.get(patternId);
      if (!pattern) return state;

      const newPatterns = new Map(state.patterns);
      newPatterns.set(patternId, { ...pattern, isLooping });
      return { patterns: newPatterns };
    });
  },

  stopAllLoops: () => {
    set((state) => {
      const newPatterns = new Map(state.patterns);
      for (const [id, pattern] of newPatterns) {
        if (pattern.isLooping) {
          newPatterns.set(id, { ...pattern, isLooping: false });
        }
      }
      return { patterns: newPatterns };
    });
  },

  getLoopingPatterns: () => {
    return Array.from(get().patterns.values()).filter(p => p.isLooping);
  },

  setActivePattern: (instrumentId, patternId) => {
    set((state) => {
      const newActiveIds = new Map(state.activePatternIds);
      newActiveIds.set(instrumentId, patternId);
      return { activePatternIds: newActiveIds };
    });
  },

  getActivePattern: (instrumentId) => {
    const patternId = get().activePatternIds.get(instrumentId);
    if (!patternId) return undefined;
    return get().patterns.get(patternId);
  },

  setGlobalBpm: (bpm) => {
    set({ globalBpm: Math.max(30, Math.min(300, bpm)) });
  },

  setGlobalBars: (bars) => {
    set({ globalBars: Math.max(1, Math.min(16, bars)) });
  },

  getPattern: (patternId) => {
    return get().patterns.get(patternId);
  },

  getPatternsForInstrument: (instrumentId) => {
    return Array.from(get().patterns.values())
      .filter(p => p.instrumentId === instrumentId);
  },
}));
