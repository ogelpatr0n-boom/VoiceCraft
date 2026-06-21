import { create } from 'zustand';

export type SoundCategory =
  | 'drums'
  | 'bass'
  | 'synth'
  | 'vocals'
  | 'fx'
  | 'keys'
  | 'guitar'
  | 'loops'
  | 'one-shots'
  | 'user';

export type SoundType = 'sample' | 'loop' | 'one-shots';

export interface SoundItem {
  id: string;
  name: string;
  category: SoundCategory;
  type: SoundType;
  bpm?: number;         // For loops
  key?: string;         // Musical key
  duration: number;     // In seconds
  tags: string[];
  path: string;         // File path or URL
  previewUrl?: string;  // For quick preview
  favorite: boolean;
  dateAdded: number;
}

export interface SoundPack {
  id: string;
  name: string;
  description: string;
  author: string;
  thumbnail?: string;
  sounds: SoundItem[];
  category: SoundCategory;
  dateAdded: number;
}

interface SoundLibraryState {
  // Library items
  sounds: SoundItem[];
  packs: SoundPack[];

  // User collections
  favorites: string[]; // Sound IDs
  recentlyUsed: string[];
  userSamples: SoundItem[];

  // Filters
  activeCategory: SoundCategory | 'all';
  searchQuery: string;
  sortBy: 'name' | 'date' | 'duration' | 'bpm';
  filterByType: SoundType | 'all';

  // Preview state
  previewingSound: string | null;
  isPreviewPlaying: boolean;

  // Actions
  addSound: (sound: Omit<SoundItem, 'id' | 'dateAdded'>) => string;
  removeSound: (id: string) => void;
  updateSound: (id: string, updates: Partial<SoundItem>) => void;
  toggleFavorite: (id: string) => void;
  addToRecentlyUsed: (id: string) => void;

  // Pack actions
  addPack: (pack: Omit<SoundPack, 'id' | 'dateAdded'>) => string;
  removePack: (id: string) => void;

  // Filter actions
  setCategory: (category: SoundCategory | 'all') => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: 'name' | 'date' | 'duration' | 'bpm') => void;
  setFilterByType: (type: SoundType | 'all') => void;

  // Preview actions
  setPreviewingSound: (id: string | null) => void;
  setIsPreviewPlaying: (playing: boolean) => void;

  // Computed
  getFilteredSounds: () => SoundItem[];
  getSoundsByCategory: (category: SoundCategory) => SoundItem[];
  getFavorites: () => SoundItem[];
  getRecentlyUsed: () => SoundItem[];
}

// Built-in drum samples (these would normally be loaded from files)
const BUILTIN_DRUMS: Omit<SoundItem, 'id' | 'dateAdded'>[] = [
  { name: 'Kick 1', category: 'drums', type: 'one-shots', duration: 0.3, tags: ['kick', 'punchy'], path: '/samples/drums/kick1.wav', favorite: false },
  { name: 'Kick 2', category: 'drums', type: 'one-shots', duration: 0.35, tags: ['kick', 'deep'], path: '/samples/drums/kick2.wav', favorite: false },
  { name: 'Snare 1', category: 'drums', type: 'one-shots', duration: 0.25, tags: ['snare', 'tight'], path: '/samples/drums/snare1.wav', favorite: false },
  { name: 'Snare 2', category: 'drums', type: 'one-shots', duration: 0.3, tags: ['snare', 'fat'], path: '/samples/drums/snare2.wav', favorite: false },
  { name: 'Hi-Hat Closed', category: 'drums', type: 'one-shots', duration: 0.1, tags: ['hihat', 'closed'], path: '/samples/drums/hihat-closed.wav', favorite: false },
  { name: 'Hi-Hat Open', category: 'drums', type: 'one-shots', duration: 0.4, tags: ['hihat', 'open'], path: '/samples/drums/hihat-open.wav', favorite: false },
  { name: 'Clap', category: 'drums', type: 'one-shots', duration: 0.2, tags: ['clap'], path: '/samples/drums/clap.wav', favorite: false },
  { name: 'Rim', category: 'drums', type: 'one-shots', duration: 0.15, tags: ['rim', 'percussion'], path: '/samples/drums/rim.wav', favorite: false },
  { name: 'Tom High', category: 'drums', type: 'one-shots', duration: 0.3, tags: ['tom', 'high'], path: '/samples/drums/tom-high.wav', favorite: false },
  { name: 'Tom Low', category: 'drums', type: 'one-shots', duration: 0.4, tags: ['tom', 'low'], path: '/samples/drums/tom-low.wav', favorite: false },
  { name: 'Crash', category: 'drums', type: 'one-shots', duration: 1.5, tags: ['cymbal', 'crash'], path: '/samples/drums/crash.wav', favorite: false },
  { name: 'Ride', category: 'drums', type: 'one-shots', duration: 0.8, tags: ['cymbal', 'ride'], path: '/samples/drums/ride.wav', favorite: false },
];

const BUILTIN_LOOPS: Omit<SoundItem, 'id' | 'dateAdded'>[] = [
  { name: 'Drum Loop 1', category: 'loops', type: 'loop', bpm: 120, duration: 4, tags: ['drums', 'rock'], path: '/samples/loops/drum-loop-1.wav', favorite: false },
  { name: 'Drum Loop 2', category: 'loops', type: 'loop', bpm: 100, duration: 4, tags: ['drums', 'hip-hop'], path: '/samples/loops/drum-loop-2.wav', favorite: false },
  { name: 'Bass Loop 1', category: 'loops', type: 'loop', bpm: 120, key: 'C', duration: 4, tags: ['bass', 'groove'], path: '/samples/loops/bass-loop-1.wav', favorite: false },
  { name: 'Synth Pad Loop', category: 'loops', type: 'loop', bpm: 120, key: 'Am', duration: 8, tags: ['synth', 'pad', 'ambient'], path: '/samples/loops/synth-pad.wav', favorite: false },
  { name: 'Guitar Loop 1', category: 'loops', type: 'loop', bpm: 90, key: 'G', duration: 4, tags: ['guitar', 'acoustic'], path: '/samples/loops/guitar-1.wav', favorite: false },
];

const BUILTIN_FX: Omit<SoundItem, 'id' | 'dateAdded'>[] = [
  { name: 'Riser 1', category: 'fx', type: 'one-shots', duration: 4, tags: ['riser', 'build'], path: '/samples/fx/riser-1.wav', favorite: false },
  { name: 'Impact 1', category: 'fx', type: 'one-shots', duration: 1, tags: ['impact', 'hit'], path: '/samples/fx/impact-1.wav', favorite: false },
  { name: 'Sweep Down', category: 'fx', type: 'one-shots', duration: 2, tags: ['sweep', 'transition'], path: '/samples/fx/sweep-down.wav', favorite: false },
  { name: 'White Noise', category: 'fx', type: 'one-shots', duration: 2, tags: ['noise', 'texture'], path: '/samples/fx/white-noise.wav', favorite: false },
  { name: 'Reverse Cymbal', category: 'fx', type: 'one-shots', duration: 1.5, tags: ['cymbal', 'reverse'], path: '/samples/fx/reverse-cymbal.wav', favorite: false },
];

const BUILTIN_VOCALS: Omit<SoundItem, 'id' | 'dateAdded'>[] = [
  { name: 'Vocal Chop 1', category: 'vocals', type: 'one-shots', duration: 0.5, key: 'C', tags: ['chop', 'female'], path: '/samples/vocals/chop-1.wav', favorite: false },
  { name: 'Vocal Chop 2', category: 'vocals', type: 'one-shots', duration: 0.4, key: 'E', tags: ['chop', 'male'], path: '/samples/vocals/chop-2.wav', favorite: false },
  { name: 'Oohs', category: 'vocals', type: 'one-shots', duration: 2, key: 'Am', tags: ['pad', 'choir'], path: '/samples/vocals/oohs.wav', favorite: false },
  { name: 'Aahs', category: 'vocals', type: 'one-shots', duration: 2, key: 'C', tags: ['pad', 'choir'], path: '/samples/vocals/aahs.wav', favorite: false },
];

// 808 Drum Kit
const SAMPLES_808: Omit<SoundItem, 'id' | 'dateAdded'>[] = [
  { name: '808 Kick Long', category: 'drums', type: 'one-shots', duration: 1.5, tags: ['808', 'kick', 'trap'], path: '/samples/808/kick-long.wav', favorite: false },
  { name: '808 Kick Short', category: 'drums', type: 'one-shots', duration: 0.5, tags: ['808', 'kick', 'punchy'], path: '/samples/808/kick-short.wav', favorite: false },
  { name: '808 Kick Distorted', category: 'drums', type: 'one-shots', duration: 1.2, tags: ['808', 'kick', 'distorted'], path: '/samples/808/kick-dist.wav', favorite: false },
  { name: '808 Snare', category: 'drums', type: 'one-shots', duration: 0.3, tags: ['808', 'snare'], path: '/samples/808/snare.wav', favorite: false },
  { name: '808 Clap', category: 'drums', type: 'one-shots', duration: 0.25, tags: ['808', 'clap'], path: '/samples/808/clap.wav', favorite: false },
  { name: '808 Hi-Hat Closed', category: 'drums', type: 'one-shots', duration: 0.1, tags: ['808', 'hihat'], path: '/samples/808/hihat-closed.wav', favorite: false },
  { name: '808 Hi-Hat Open', category: 'drums', type: 'one-shots', duration: 0.5, tags: ['808', 'hihat', 'open'], path: '/samples/808/hihat-open.wav', favorite: false },
  { name: '808 Cowbell', category: 'drums', type: 'one-shots', duration: 0.3, tags: ['808', 'cowbell', 'percussion'], path: '/samples/808/cowbell.wav', favorite: false },
  { name: '808 Tom Low', category: 'drums', type: 'one-shots', duration: 0.8, tags: ['808', 'tom'], path: '/samples/808/tom-low.wav', favorite: false },
  { name: '808 Tom High', category: 'drums', type: 'one-shots', duration: 0.6, tags: ['808', 'tom'], path: '/samples/808/tom-high.wav', favorite: false },
];

// 909 Drum Kit
const SAMPLES_909: Omit<SoundItem, 'id' | 'dateAdded'>[] = [
  { name: '909 Kick', category: 'drums', type: 'one-shots', duration: 0.4, tags: ['909', 'kick', 'house'], path: '/samples/909/kick.wav', favorite: false },
  { name: '909 Snare', category: 'drums', type: 'one-shots', duration: 0.35, tags: ['909', 'snare'], path: '/samples/909/snare.wav', favorite: false },
  { name: '909 Clap', category: 'drums', type: 'one-shots', duration: 0.3, tags: ['909', 'clap'], path: '/samples/909/clap.wav', favorite: false },
  { name: '909 Hi-Hat Closed', category: 'drums', type: 'one-shots', duration: 0.08, tags: ['909', 'hihat'], path: '/samples/909/hihat-closed.wav', favorite: false },
  { name: '909 Hi-Hat Open', category: 'drums', type: 'one-shots', duration: 0.4, tags: ['909', 'hihat', 'open'], path: '/samples/909/hihat-open.wav', favorite: false },
  { name: '909 Ride', category: 'drums', type: 'one-shots', duration: 1.0, tags: ['909', 'ride', 'cymbal'], path: '/samples/909/ride.wav', favorite: false },
  { name: '909 Crash', category: 'drums', type: 'one-shots', duration: 1.5, tags: ['909', 'crash', 'cymbal'], path: '/samples/909/crash.wav', favorite: false },
  { name: '909 Tom Low', category: 'drums', type: 'one-shots', duration: 0.5, tags: ['909', 'tom'], path: '/samples/909/tom-low.wav', favorite: false },
  { name: '909 Tom Mid', category: 'drums', type: 'one-shots', duration: 0.45, tags: ['909', 'tom'], path: '/samples/909/tom-mid.wav', favorite: false },
  { name: '909 Tom High', category: 'drums', type: 'one-shots', duration: 0.4, tags: ['909', 'tom'], path: '/samples/909/tom-high.wav', favorite: false },
];

// Trap Samples
const SAMPLES_TRAP: Omit<SoundItem, 'id' | 'dateAdded'>[] = [
  { name: 'Trap Hi-Hat Roll', category: 'drums', type: 'one-shots', duration: 0.5, tags: ['trap', 'hihat', 'roll'], path: '/samples/trap/hihat-roll.wav', favorite: false },
  { name: 'Trap Snare Layer', category: 'drums', type: 'one-shots', duration: 0.3, tags: ['trap', 'snare', 'layer'], path: '/samples/trap/snare-layer.wav', favorite: false },
  { name: 'Trap Perc 1', category: 'drums', type: 'one-shots', duration: 0.2, tags: ['trap', 'percussion'], path: '/samples/trap/perc-1.wav', favorite: false },
  { name: 'Trap Loop 140', category: 'loops', type: 'loop', bpm: 140, duration: 4, tags: ['trap', 'drums'], path: '/samples/trap/loop-140.wav', favorite: false },
  { name: 'Trap Loop 150', category: 'loops', type: 'loop', bpm: 150, duration: 4, tags: ['trap', 'drums'], path: '/samples/trap/loop-150.wav', favorite: false },
  { name: 'Trap Bass C', category: 'bass', type: 'one-shots', duration: 2, key: 'C', tags: ['trap', 'bass', '808'], path: '/samples/trap/bass-c.wav', favorite: false },
  { name: 'Trap Bass F', category: 'bass', type: 'one-shots', duration: 2, key: 'F', tags: ['trap', 'bass', '808'], path: '/samples/trap/bass-f.wav', favorite: false },
];

// House Samples
const SAMPLES_HOUSE: Omit<SoundItem, 'id' | 'dateAdded'>[] = [
  { name: 'House Kick', category: 'drums', type: 'one-shots', duration: 0.35, tags: ['house', 'kick'], path: '/samples/house/kick.wav', favorite: false },
  { name: 'House Clap', category: 'drums', type: 'one-shots', duration: 0.25, tags: ['house', 'clap'], path: '/samples/house/clap.wav', favorite: false },
  { name: 'House Shaker', category: 'drums', type: 'one-shots', duration: 0.2, tags: ['house', 'shaker', 'percussion'], path: '/samples/house/shaker.wav', favorite: false },
  { name: 'House Loop 124', category: 'loops', type: 'loop', bpm: 124, duration: 4, tags: ['house', 'drums'], path: '/samples/house/loop-124.wav', favorite: false },
  { name: 'House Loop 128', category: 'loops', type: 'loop', bpm: 128, duration: 4, tags: ['house', 'drums'], path: '/samples/house/loop-128.wav', favorite: false },
  { name: 'House Piano Chords', category: 'loops', type: 'loop', bpm: 124, key: 'Am', duration: 8, tags: ['house', 'piano', 'chords'], path: '/samples/house/piano-chords.wav', favorite: false },
  { name: 'House Organ Stab', category: 'synth', type: 'one-shots', duration: 0.5, key: 'C', tags: ['house', 'organ', 'stab'], path: '/samples/house/organ-stab.wav', favorite: false },
];

// Lo-Fi Samples
const SAMPLES_LOFI: Omit<SoundItem, 'id' | 'dateAdded'>[] = [
  { name: 'Lo-Fi Kick', category: 'drums', type: 'one-shots', duration: 0.3, tags: ['lofi', 'kick', 'dusty'], path: '/samples/lofi/kick.wav', favorite: false },
  { name: 'Lo-Fi Snare', category: 'drums', type: 'one-shots', duration: 0.25, tags: ['lofi', 'snare'], path: '/samples/lofi/snare.wav', favorite: false },
  { name: 'Lo-Fi Hat', category: 'drums', type: 'one-shots', duration: 0.1, tags: ['lofi', 'hihat'], path: '/samples/lofi/hat.wav', favorite: false },
  { name: 'Lo-Fi Loop 85', category: 'loops', type: 'loop', bpm: 85, duration: 4, tags: ['lofi', 'drums', 'chill'], path: '/samples/lofi/loop-85.wav', favorite: false },
  { name: 'Lo-Fi Loop 90', category: 'loops', type: 'loop', bpm: 90, duration: 4, tags: ['lofi', 'drums'], path: '/samples/lofi/loop-90.wav', favorite: false },
  { name: 'Lo-Fi Piano', category: 'loops', type: 'loop', bpm: 85, key: 'Cm', duration: 8, tags: ['lofi', 'piano', 'jazzy'], path: '/samples/lofi/piano.wav', favorite: false },
  { name: 'Lo-Fi Vinyl Crackle', category: 'fx', type: 'loop', duration: 10, tags: ['lofi', 'vinyl', 'texture'], path: '/samples/lofi/vinyl.wav', favorite: false },
];

// Dubstep Samples
const SAMPLES_DUBSTEP: Omit<SoundItem, 'id' | 'dateAdded'>[] = [
  { name: 'Dubstep Kick', category: 'drums', type: 'one-shots', duration: 0.4, tags: ['dubstep', 'kick', 'heavy'], path: '/samples/dubstep/kick.wav', favorite: false },
  { name: 'Dubstep Snare', category: 'drums', type: 'one-shots', duration: 0.35, tags: ['dubstep', 'snare'], path: '/samples/dubstep/snare.wav', favorite: false },
  { name: 'Dubstep Loop 140', category: 'loops', type: 'loop', bpm: 140, duration: 4, tags: ['dubstep', 'drums'], path: '/samples/dubstep/loop-140.wav', favorite: false },
  { name: 'Wobble Bass C', category: 'bass', type: 'one-shots', duration: 2, key: 'C', tags: ['dubstep', 'bass', 'wobble'], path: '/samples/dubstep/wobble-c.wav', favorite: false },
  { name: 'Wobble Bass F', category: 'bass', type: 'one-shots', duration: 2, key: 'F', tags: ['dubstep', 'bass', 'wobble'], path: '/samples/dubstep/wobble-f.wav', favorite: false },
  { name: 'Dubstep Riser', category: 'fx', type: 'one-shots', duration: 8, tags: ['dubstep', 'riser', 'build'], path: '/samples/dubstep/riser.wav', favorite: false },
  { name: 'Dubstep Drop Impact', category: 'fx', type: 'one-shots', duration: 2, tags: ['dubstep', 'impact', 'drop'], path: '/samples/dubstep/drop-impact.wav', favorite: false },
];

// Transition FX
const SAMPLES_TRANSITIONS: Omit<SoundItem, 'id' | 'dateAdded'>[] = [
  { name: 'Riser Short', category: 'fx', type: 'one-shots', duration: 2, tags: ['riser', 'transition', 'build'], path: '/samples/transitions/riser-short.wav', favorite: false },
  { name: 'Riser Long', category: 'fx', type: 'one-shots', duration: 8, tags: ['riser', 'transition', 'build'], path: '/samples/transitions/riser-long.wav', favorite: false },
  { name: 'Downlifter', category: 'fx', type: 'one-shots', duration: 4, tags: ['downlifter', 'transition'], path: '/samples/transitions/downlifter.wav', favorite: false },
  { name: 'Impact Boom', category: 'fx', type: 'one-shots', duration: 2, tags: ['impact', 'boom', 'drop'], path: '/samples/transitions/impact-boom.wav', favorite: false },
  { name: 'Impact Hit', category: 'fx', type: 'one-shots', duration: 1, tags: ['impact', 'hit'], path: '/samples/transitions/impact-hit.wav', favorite: false },
  { name: 'Sweep Up', category: 'fx', type: 'one-shots', duration: 2, tags: ['sweep', 'transition'], path: '/samples/transitions/sweep-up.wav', favorite: false },
  { name: 'Sweep Down', category: 'fx', type: 'one-shots', duration: 2, tags: ['sweep', 'transition'], path: '/samples/transitions/sweep-down.wav', favorite: false },
  { name: 'Noise Burst', category: 'fx', type: 'one-shots', duration: 0.5, tags: ['noise', 'burst', 'glitch'], path: '/samples/transitions/noise-burst.wav', favorite: false },
];

export const useSoundLibraryStore = create<SoundLibraryState>((set, get) => ({
  // Initialize with built-in sounds
  sounds: [
    ...BUILTIN_DRUMS.map((s, i) => ({ ...s, id: `drum-${i}`, dateAdded: Date.now() - 1000000 })),
    ...BUILTIN_LOOPS.map((s, i) => ({ ...s, id: `loop-${i}`, dateAdded: Date.now() - 1000000 })),
    ...BUILTIN_FX.map((s, i) => ({ ...s, id: `fx-${i}`, dateAdded: Date.now() - 1000000 })),
    ...BUILTIN_VOCALS.map((s, i) => ({ ...s, id: `vocal-${i}`, dateAdded: Date.now() - 1000000 })),
    ...SAMPLES_808.map((s, i) => ({ ...s, id: `808-${i}`, dateAdded: Date.now() - 900000 })),
    ...SAMPLES_909.map((s, i) => ({ ...s, id: `909-${i}`, dateAdded: Date.now() - 900000 })),
    ...SAMPLES_TRAP.map((s, i) => ({ ...s, id: `trap-${i}`, dateAdded: Date.now() - 800000 })),
    ...SAMPLES_HOUSE.map((s, i) => ({ ...s, id: `house-${i}`, dateAdded: Date.now() - 800000 })),
    ...SAMPLES_LOFI.map((s, i) => ({ ...s, id: `lofi-${i}`, dateAdded: Date.now() - 700000 })),
    ...SAMPLES_DUBSTEP.map((s, i) => ({ ...s, id: `dubstep-${i}`, dateAdded: Date.now() - 700000 })),
    ...SAMPLES_TRANSITIONS.map((s, i) => ({ ...s, id: `trans-${i}`, dateAdded: Date.now() - 600000 })),
  ],
  packs: [],
  favorites: [],
  recentlyUsed: [],
  userSamples: [],
  activeCategory: 'all',
  searchQuery: '',
  sortBy: 'name',
  filterByType: 'all',
  previewingSound: null,
  isPreviewPlaying: false,

  addSound: (sound) => {
    const id = crypto.randomUUID();
    const newSound: SoundItem = {
      ...sound,
      id,
      dateAdded: Date.now(),
    };
    set((s) => ({ sounds: [...s.sounds, newSound] }));
    return id;
  },

  removeSound: (id) => {
    set((s) => ({
      sounds: s.sounds.filter((sound) => sound.id !== id),
      favorites: s.favorites.filter((favId) => favId !== id),
      recentlyUsed: s.recentlyUsed.filter((usedId) => usedId !== id),
    }));
  },

  updateSound: (id, updates) => {
    set((s) => ({
      sounds: s.sounds.map((sound) =>
        sound.id === id ? { ...sound, ...updates } : sound
      ),
    }));
  },

  toggleFavorite: (id) => {
    set((s) => {
      const isFavorite = s.favorites.includes(id);
      return {
        favorites: isFavorite
          ? s.favorites.filter((favId) => favId !== id)
          : [...s.favorites, id],
        sounds: s.sounds.map((sound) =>
          sound.id === id ? { ...sound, favorite: !isFavorite } : sound
        ),
      };
    });
  },

  addToRecentlyUsed: (id) => {
    set((s) => ({
      recentlyUsed: [id, ...s.recentlyUsed.filter((usedId) => usedId !== id)].slice(0, 20),
    }));
  },

  addPack: (pack) => {
    const id = crypto.randomUUID();
    const newPack: SoundPack = {
      ...pack,
      id,
      dateAdded: Date.now(),
    };
    set((s) => ({
      packs: [...s.packs, newPack],
      sounds: [...s.sounds, ...pack.sounds.map((sound) => ({ ...sound, dateAdded: Date.now() }))],
    }));
    return id;
  },

  removePack: (id) => {
    const pack = get().packs.find((p) => p.id === id);
    if (!pack) return;

    const soundIds = pack.sounds.map((s) => s.id);
    set((s) => ({
      packs: s.packs.filter((p) => p.id !== id),
      sounds: s.sounds.filter((sound) => !soundIds.includes(sound.id)),
    }));
  },

  setCategory: (category) => set({ activeCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  setFilterByType: (type) => set({ filterByType: type }),

  setPreviewingSound: (id) => set({ previewingSound: id }),
  setIsPreviewPlaying: (playing) => set({ isPreviewPlaying: playing }),

  getFilteredSounds: () => {
    const { sounds, activeCategory, searchQuery, sortBy, filterByType } = get();

    let filtered = sounds;

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter((s) => s.category === activeCategory);
    }

    // Filter by type
    if (filterByType !== 'all') {
      filtered = filtered.filter((s) => s.type === filterByType);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'date':
        filtered.sort((a, b) => b.dateAdded - a.dateAdded);
        break;
      case 'duration':
        filtered.sort((a, b) => a.duration - b.duration);
        break;
      case 'bpm':
        filtered.sort((a, b) => (a.bpm || 0) - (b.bpm || 0));
        break;
    }

    return filtered;
  },

  getSoundsByCategory: (category) => {
    return get().sounds.filter((s) => s.category === category);
  },

  getFavorites: () => {
    const { sounds, favorites } = get();
    return sounds.filter((s) => favorites.includes(s.id));
  },

  getRecentlyUsed: () => {
    const { sounds, recentlyUsed } = get();
    return recentlyUsed
      .map((id) => sounds.find((s) => s.id === id))
      .filter((s): s is SoundItem => s !== undefined);
  },
}));
