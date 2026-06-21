import { create } from 'zustand';
import type { MidiNote } from '../audio/midi/midi-event';

export type ClipType = 'audio' | 'midi';

export interface TimelineClip {
  id: string;
  trackId: string;
  type: ClipType;
  name: string;
  startBeat: number;
  duration: number; // in beats
  color: string;
  // For audio clips
  audioBufferId?: string;
  trimStart?: number;
  trimEnd?: number;
  // For MIDI clips
  notes?: MidiNote[];
  instrumentId?: string;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: ClipType;
  color: string;
  height: number; // track height in pixels
  gain: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  instrumentId?: string; // For MIDI tracks
}

export type SelectionType = 'clip' | 'track' | 'notes' | 'time-range';

export interface TimelineSelection {
  type: SelectionType;
  ids: string[];
  timeRange?: { start: number; end: number };
}

export type EditTool = 'select' | 'draw' | 'erase' | 'slice' | 'mute';

interface TimelineState {
  // Tracks and clips
  tracks: TimelineTrack[];
  clips: TimelineClip[];

  // View state
  scrollX: number;           // horizontal scroll in pixels
  scrollY: number;           // vertical scroll in pixels
  zoom: number;              // pixels per beat
  viewportWidth: number;     // visible width in pixels
  viewportHeight: number;    // visible height in pixels

  // Selection
  selection: TimelineSelection | null;
  editTool: EditTool;

  // Clipboard
  clipboardClips: TimelineClip[];

  // Track actions
  addTrack: (type: ClipType, name?: string, instrumentId?: string) => string;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<TimelineTrack>) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;

  // Clip actions
  addClip: (clip: Omit<TimelineClip, 'id'>) => string;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<TimelineClip>) => void;
  moveClip: (id: string, newTrackId: string, newStartBeat: number) => void;
  duplicateClip: (id: string) => string | null;
  splitClip: (id: string, beatPosition: number) => [string, string] | null;

  // Selection actions
  setSelection: (selection: TimelineSelection | null) => void;
  selectClip: (id: string, addToSelection?: boolean) => void;
  selectTrack: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Clipboard actions
  copySelection: () => void;
  cutSelection: () => void;
  paste: (beatPosition: number) => void;
  deleteSelection: () => void;

  // View actions
  setZoom: (zoom: number) => void;
  setScroll: (x: number, y: number) => void;
  setViewport: (width: number, height: number) => void;
  setEditTool: (tool: EditTool) => void;

  // Utilities
  getTrack: (id: string) => TimelineTrack | undefined;
  getClip: (id: string) => TimelineClip | undefined;
  getClipsForTrack: (trackId: string) => TimelineClip[];
  getClipsInRange: (startBeat: number, endBeat: number) => TimelineClip[];
  getTrackAtY: (y: number) => TimelineTrack | undefined;
  beatToPixel: (beat: number) => number;
  pixelToBeat: (pixel: number) => number;
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

const DEFAULT_TRACK_HEIGHT = 80;
const MIN_ZOOM = 10;  // pixels per beat
const MAX_ZOOM = 200; // pixels per beat

export const useTimelineStore = create<TimelineState>((set, get) => ({
  tracks: [],
  clips: [],
  scrollX: 0,
  scrollY: 0,
  zoom: 50, // 50 pixels per beat
  viewportWidth: 800,
  viewportHeight: 400,
  selection: null,
  editTool: 'select',
  clipboardClips: [],

  addTrack: (type, name, instrumentId) => {
    const id = crypto.randomUUID();
    const trackCount = get().tracks.length;
    const color = TRACK_COLORS[trackCount % TRACK_COLORS.length];
    const defaultName = name ?? `${type === 'midi' ? 'MIDI' : 'Audio'} ${trackCount + 1}`;

    const track: TimelineTrack = {
      id,
      name: defaultName,
      type,
      color,
      height: DEFAULT_TRACK_HEIGHT,
      gain: 1,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      instrumentId,
    };

    set((s) => ({ tracks: [...s.tracks, track] }));
    return id;
  },

  removeTrack: (id) => {
    set((s) => ({
      tracks: s.tracks.filter((t) => t.id !== id),
      clips: s.clips.filter((c) => c.trackId !== id),
      selection: s.selection?.type === 'track' && s.selection.ids.includes(id)
        ? null
        : s.selection,
    }));
  },

  updateTrack: (id, updates) => {
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  reorderTracks: (fromIndex, toIndex) => {
    set((s) => {
      const tracks = [...s.tracks];
      const [track] = tracks.splice(fromIndex, 1);
      tracks.splice(toIndex, 0, track);
      return { tracks };
    });
  },

  addClip: (clipData) => {
    const id = crypto.randomUUID();
    const clip: TimelineClip = { ...clipData, id };
    set((s) => ({ clips: [...s.clips, clip] }));
    return id;
  },

  removeClip: (id) => {
    set((s) => ({
      clips: s.clips.filter((c) => c.id !== id),
      selection: s.selection?.ids.includes(id)
        ? { ...s.selection, ids: s.selection.ids.filter((i) => i !== id) }
        : s.selection,
    }));
  },

  updateClip: (id, updates) => {
    set((s) => ({
      clips: s.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  },

  moveClip: (id, newTrackId, newStartBeat) => {
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === id
          ? { ...c, trackId: newTrackId, startBeat: Math.max(0, newStartBeat) }
          : c
      ),
    }));
  },

  duplicateClip: (id) => {
    const clip = get().clips.find((c) => c.id === id);
    if (!clip) return null;

    const newId = crypto.randomUUID();
    const newClip: TimelineClip = {
      ...clip,
      id: newId,
      name: `${clip.name} (copy)`,
      startBeat: clip.startBeat + clip.duration,
      notes: clip.notes?.map((n) => ({ ...n, id: crypto.randomUUID() })),
    };

    set((s) => ({ clips: [...s.clips, newClip] }));
    return newId;
  },

  splitClip: (id, beatPosition) => {
    const clip = get().clips.find((c) => c.id === id);
    if (!clip) return null;

    const splitPoint = beatPosition - clip.startBeat;
    if (splitPoint <= 0 || splitPoint >= clip.duration) return null;

    const firstId = crypto.randomUUID();
    const secondId = crypto.randomUUID();

    const firstClip: TimelineClip = {
      ...clip,
      id: firstId,
      duration: splitPoint,
      notes: clip.notes?.filter((n) => n.start + n.duration <= splitPoint),
    };

    const secondClip: TimelineClip = {
      ...clip,
      id: secondId,
      startBeat: beatPosition,
      duration: clip.duration - splitPoint,
      notes: clip.notes
        ?.filter((n) => n.start >= splitPoint)
        .map((n) => ({ ...n, id: crypto.randomUUID(), start: n.start - splitPoint })),
    };

    set((s) => ({
      clips: [...s.clips.filter((c) => c.id !== id), firstClip, secondClip],
    }));

    return [firstId, secondId];
  },

  setSelection: (selection) => {
    set({ selection });
  },

  selectClip: (id, addToSelection = false) => {
    set((s) => {
      if (addToSelection && s.selection?.type === 'clip') {
        const ids = s.selection.ids.includes(id)
          ? s.selection.ids.filter((i) => i !== id)
          : [...s.selection.ids, id];
        return { selection: { type: 'clip', ids } };
      }
      return { selection: { type: 'clip', ids: [id] } };
    });
  },

  selectTrack: (id) => {
    set({ selection: { type: 'track', ids: [id] } });
  },

  selectAll: () => {
    set((s) => ({
      selection: { type: 'clip', ids: s.clips.map((c) => c.id) },
    }));
  },

  clearSelection: () => {
    set({ selection: null });
  },

  copySelection: () => {
    const { selection, clips } = get();
    if (selection?.type !== 'clip') return;

    const selectedClips = clips.filter((c) => selection.ids.includes(c.id));
    set({ clipboardClips: selectedClips.map((c) => ({ ...c })) });
  },

  cutSelection: () => {
    get().copySelection();
    get().deleteSelection();
  },

  paste: (beatPosition) => {
    const { clipboardClips } = get();
    if (clipboardClips.length === 0) return;

    // Find the earliest start time
    const minStart = Math.min(...clipboardClips.map((c) => c.startBeat));

    const newClips = clipboardClips.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
      startBeat: beatPosition + (c.startBeat - minStart),
      notes: c.notes?.map((n) => ({ ...n, id: crypto.randomUUID() })),
    }));

    set((s) => ({
      clips: [...s.clips, ...newClips],
      selection: { type: 'clip', ids: newClips.map((c) => c.id) },
    }));
  },

  deleteSelection: () => {
    const { selection } = get();
    if (!selection) return;

    if (selection.type === 'clip') {
      set((s) => ({
        clips: s.clips.filter((c) => !selection.ids.includes(c.id)),
        selection: null,
      }));
    } else if (selection.type === 'track') {
      for (const id of selection.ids) {
        get().removeTrack(id);
      }
    }
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)) });
  },

  setScroll: (x, y) => {
    set({ scrollX: Math.max(0, x), scrollY: Math.max(0, y) });
  },

  setViewport: (width, height) => {
    set({ viewportWidth: width, viewportHeight: height });
  },

  setEditTool: (tool) => {
    set({ editTool: tool });
  },

  getTrack: (id) => get().tracks.find((t) => t.id === id),

  getClip: (id) => get().clips.find((c) => c.id === id),

  getClipsForTrack: (trackId) => get().clips.filter((c) => c.trackId === trackId),

  getClipsInRange: (startBeat, endBeat) =>
    get().clips.filter((c) => {
      const clipEnd = c.startBeat + c.duration;
      return c.startBeat < endBeat && clipEnd > startBeat;
    }),

  getTrackAtY: (y) => {
    const { tracks, scrollY } = get();
    let currentY = -scrollY;

    for (const track of tracks) {
      if (y >= currentY && y < currentY + track.height) {
        return track;
      }
      currentY += track.height;
    }
    return undefined;
  },

  beatToPixel: (beat) => {
    const { zoom, scrollX } = get();
    return beat * zoom - scrollX;
  },

  pixelToBeat: (pixel) => {
    const { zoom, scrollX } = get();
    return (pixel + scrollX) / zoom;
  },
}));
