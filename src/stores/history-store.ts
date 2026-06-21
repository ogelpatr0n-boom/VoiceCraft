import { create } from 'zustand';
import { usePatternStore } from './pattern-store';
import { useTimelineStore } from './timeline-store';
import type { Pattern } from './pattern-store';
import type { TimelineTrack, TimelineClip } from './timeline-store';

interface Snapshot {
  patterns: Array<[string, Pattern]>;
  activePatternIds: Array<[string, string]>;
  timelineTracks: TimelineTrack[];
  timelineClips: TimelineClip[];
}

interface HistoryState {
  past: Snapshot[];
  future: Snapshot[];
  canUndo: boolean;
  canRedo: boolean;
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

function captureSnapshot(): Snapshot {
  const { patterns, activePatternIds } = usePatternStore.getState();
  const { tracks, clips } = useTimelineStore.getState();
  return {
    patterns: Array.from(patterns.entries()).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]),
    activePatternIds: Array.from(activePatternIds.entries()),
    timelineTracks: JSON.parse(JSON.stringify(tracks)),
    timelineClips: JSON.parse(JSON.stringify(clips)),
  };
}

function restoreSnapshot(snapshot: Snapshot): void {
  usePatternStore.setState({
    patterns: new Map(snapshot.patterns),
    activePatternIds: new Map(snapshot.activePatternIds),
  });
  useTimelineStore.setState({
    tracks: snapshot.timelineTracks,
    clips: snapshot.timelineClips,
  });
}

const MAX_HISTORY = 50;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  pushSnapshot: () => {
    const snapshot = captureSnapshot();
    set(s => {
      const past = [...s.past, snapshot].slice(-MAX_HISTORY);
      return { past, future: [], canUndo: past.length > 0, canRedo: false };
    });
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return;

    const current = captureSnapshot();
    const previous = past[past.length - 1];
    restoreSnapshot(previous);

    set(s => {
      const newPast = s.past.slice(0, -1);
      const future = [current, ...s.future];
      return { past: newPast, future, canUndo: newPast.length > 0, canRedo: true };
    });
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return;

    const current = captureSnapshot();
    const next = future[0];
    restoreSnapshot(next);

    set(s => {
      const past = [...s.past, current];
      const newFuture = s.future.slice(1);
      return { past, future: newFuture, canUndo: true, canRedo: newFuture.length > 0 };
    });
  },

  clear: () => set({ past: [], future: [], canUndo: false, canRedo: false }),
}));
