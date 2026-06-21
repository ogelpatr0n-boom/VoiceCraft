// Chord progressions organized by key + mood.
// Intervals are semitone offsets from the root. MIDI octave 4 base.

export interface ChordDef {
  name: string;       // e.g. "Am"
  root: number;       // MIDI note (root of chord)
  intervals: number[]; // semitone offsets from root
  duration: number;   // beats
}

export interface Progression {
  id: string;
  name: string;
  mood: string;
  genre: string;
  chords: ChordDef[];
  bpm: number;
  bars: number;
}

// Build a chord from root MIDI note + quality
function chord(name: string, root: number, type: string, duration = 4): ChordDef {
  const types: Record<string, number[]> = {
    maj:   [0, 4, 7],
    min:   [0, 3, 7],
    dom7:  [0, 4, 7, 10],
    maj7:  [0, 4, 7, 11],
    min7:  [0, 3, 7, 10],
    sus2:  [0, 2, 7],
    sus4:  [0, 5, 7],
    dim:   [0, 3, 6],
    aug:   [0, 4, 8],
    add9:  [0, 4, 7, 14],
    min9:  [0, 3, 7, 10, 14],
  };
  return { name, root, intervals: types[type] ?? types.maj, duration };
}

// Keys (MIDI note numbers, octave 4)
const C4 = 60; const Db4 = 61; const D4 = 62; const Eb4 = 63;
const E4 = 64; const F4 = 65; const Gb4 = 66; const G4 = 67;
const Ab4 = 68; const A4 = 69; const Bb4 = 70; const B4 = 71;

export const PROGRESSIONS: Progression[] = [
  // ── Happy / Uplifting ─────────────────────────────────────────────────────
  {
    id: 'pop-happy-C', name: 'Happy Pop Loop', mood: 'Happy', genre: 'Pop', bpm: 120, bars: 4,
    chords: [chord('C',C4,'maj'), chord('G',G4-12,'maj'), chord('Am',A4-12,'min'), chord('F',F4,'maj')],
  },
  {
    id: 'pop-happy-G', name: 'Summer Bounce', mood: 'Happy', genre: 'Pop', bpm: 120, bars: 4,
    chords: [chord('G',G4-12,'maj'), chord('D',D4,'maj'), chord('Em',E4,'min'), chord('C',C4,'maj')],
  },
  {
    id: 'pop-happy-D', name: 'Radio Bright', mood: 'Happy', genre: 'Pop', bpm: 116, bars: 4,
    chords: [chord('D',D4,'maj'), chord('A',A4-12,'maj'), chord('Bm',B4-12,'min'), chord('G',G4-12,'maj')],
  },
  {
    id: 'rnb-happy-Bb', name: 'Smooth Feel Good', mood: 'Happy', genre: 'R&B', bpm: 90, bars: 4,
    chords: [chord('Bbmaj7',Bb4-12,'maj7',4), chord('Ebmaj7',Eb4,'maj7',4), chord('Gm7',G4-12,'min7',4), chord('Cm7',C4,'min7',4)],
  },
  // ── Sad / Emotional ───────────────────────────────────────────────────────
  {
    id: 'sad-Am', name: 'Falling Apart', mood: 'Sad', genre: 'Pop', bpm: 72, bars: 4,
    chords: [chord('Am',A4-12,'min'), chord('F',F4,'maj'), chord('C',C4,'maj'), chord('G',G4-12,'maj')],
  },
  {
    id: 'sad-Em', name: 'Empty Room', mood: 'Sad', genre: 'Indie', bpm: 68, bars: 4,
    chords: [chord('Em',E4,'min'), chord('C',C4,'maj'), chord('G',G4-12,'maj'), chord('D',D4,'maj')],
  },
  {
    id: 'sad-Dm', name: 'Last Letter', mood: 'Sad', genre: 'Ballad', bpm: 60, bars: 4,
    chords: [chord('Dm',D4,'min'), chord('Bb',Bb4-12,'maj'), chord('F',F4,'maj'), chord('C',C4,'maj')],
  },
  {
    id: 'sad-Bm', name: 'Winter Drive', mood: 'Sad', genre: 'Indie', bpm: 80, bars: 4,
    chords: [chord('Bm',B4-12,'min'), chord('G',G4-12,'maj'), chord('D',D4,'maj'), chord('A',A4-12,'maj')],
  },
  // ── Dark / Moody ──────────────────────────────────────────────────────────
  {
    id: 'dark-Cm', name: 'Midnight Shadows', mood: 'Dark', genre: 'Trap', bpm: 140, bars: 4,
    chords: [chord('Cm',C4,'min',4), chord('Ab',Ab4-12,'maj',4), chord('Eb',Eb4,'maj',4), chord('Bb',Bb4-12,'maj',4)],
  },
  {
    id: 'dark-Am-dim', name: 'Haunted', mood: 'Dark', genre: 'Horror', bpm: 80, bars: 4,
    chords: [chord('Am',A4-12,'min',4), chord('Bdim',B4-12,'dim',2), chord('E',E4,'dom7',2), chord('Am',A4-12,'min',4)],
  },
  {
    id: 'dark-Em7', name: 'Lo-Fi Gloom', mood: 'Dark', genre: 'Lo-Fi', bpm: 75, bars: 4,
    chords: [chord('Em7',E4,'min7',4), chord('Am7',A4-12,'min7',4), chord('Cmaj7',C4,'maj7',4), chord('Bm7',B4-12,'min7',4)],
  },
  // ── Energetic / Hype ──────────────────────────────────────────────────────
  {
    id: 'hype-C', name: 'Main Stage Drop', mood: 'Energetic', genre: 'EDM', bpm: 128, bars: 4,
    chords: [chord('C',C4,'maj',2), chord('Am',A4-12,'min',2), chord('F',F4,'maj',2), chord('G',G4-12,'maj',2)],
  },
  {
    id: 'hype-A', name: 'Pump Up', mood: 'Energetic', genre: 'Hip-Hop', bpm: 95, bars: 4,
    chords: [chord('A',A4-12,'min',4), chord('G',G4-12,'maj',4), chord('F',F4,'maj',4), chord('E',E4,'dom7',4)],
  },
  {
    id: 'hype-D', name: 'Run the City', mood: 'Energetic', genre: 'Trap', bpm: 150, bars: 2,
    chords: [chord('Dm',D4,'min',4), chord('Bb',Bb4-12,'maj',2), chord('C',C4,'maj',2)],
  },
  // ── Chill / Relaxed ───────────────────────────────────────────────────────
  {
    id: 'chill-Fmaj7', name: 'Sunday Afternoon', mood: 'Chill', genre: 'Lo-Fi', bpm: 75, bars: 4,
    chords: [chord('Fmaj7',F4,'maj7',4), chord('Em7',E4,'min7',4), chord('Am7',A4-12,'min7',4), chord('Dm7',D4,'min7',4)],
  },
  {
    id: 'chill-C', name: 'Coffee Shop', mood: 'Chill', genre: 'Jazz', bpm: 90, bars: 4,
    chords: [chord('Cmaj7',C4,'maj7',4), chord('Am7',A4-12,'min7',4), chord('Dm7',D4,'min7',4), chord('G7',G4-12,'dom7',4)],
  },
  {
    id: 'chill-Eb', name: 'Lazy Daze', mood: 'Chill', genre: 'R&B', bpm: 80, bars: 4,
    chords: [chord('Ebmaj7',Eb4,'maj7',4), chord('Abmaj7',Ab4-12,'maj7',4), chord('Fm7',F4,'min7',4), chord('Bb7',Bb4-12,'dom7',4)],
  },
  // ── Romantic ──────────────────────────────────────────────────────────────
  {
    id: 'romantic-G', name: 'First Dance', mood: 'Romantic', genre: 'Ballad', bpm: 76, bars: 4,
    chords: [chord('G',G4-12,'maj7',4), chord('Em',E4,'min7',4), chord('C',C4,'maj7',4), chord('D',D4,'sus4',4)],
  },
  {
    id: 'romantic-Ab', name: 'Candlelight', mood: 'Romantic', genre: 'Soul', bpm: 68, bars: 4,
    chords: [chord('Abmaj7',Ab4-12,'maj7',4), chord('Fm7',F4,'min7',4), chord('Dbmaj7',Db4,'maj7',4), chord('Eb7',Eb4,'dom7',4)],
  },
  // ── Country ───────────────────────────────────────────────────────────────
  {
    id: 'country-G', name: 'Dirt Road Drive', mood: 'Happy', genre: 'Country', bpm: 100, bars: 4,
    chords: [chord('G',G4-12,'maj',4), chord('C',C4,'maj',4), chord('D',D4,'maj',4), chord('G',G4-12,'maj',4)],
  },
  {
    id: 'country-A', name: 'Honky Tonk Night', mood: 'Energetic', genre: 'Country', bpm: 108, bars: 4,
    chords: [chord('A',A4-12,'maj',4), chord('D',D4,'maj',4), chord('E',E4,'maj',4), chord('A',A4-12,'maj',4)],
  },
  // ── Jazz ──────────────────────────────────────────────────────────────────
  {
    id: 'jazz-ii-V-I-C', name: 'ii-V-I in C', mood: 'Chill', genre: 'Jazz', bpm: 120, bars: 4,
    chords: [chord('Dm7',D4,'min7',4), chord('G7',G4-12,'dom7',4), chord('Cmaj7',C4,'maj7',4), chord('Am7',A4-12,'min7',4)],
  },
  {
    id: 'jazz-autumn', name: 'Autumn Leaves (excerpt)', mood: 'Sad', genre: 'Jazz', bpm: 110, bars: 8,
    chords: [
      chord('Cm7',C4,'min7',4), chord('F7',F4,'dom7',4),
      chord('Bbmaj7',Bb4-12,'maj7',4), chord('Ebmaj7',Eb4,'maj7',4),
      chord('Am7b5',A4-12,'dim',4), chord('D7',D4,'dom7',4),
      chord('Gm',G4-12,'min',4), chord('Gm',G4-12,'min',4),
    ],
  },
];

export const MOODS = [...new Set(PROGRESSIONS.map(p => p.mood))];
export const GENRES = [...new Set(PROGRESSIONS.map(p => p.genre))];
