// Loop library — MIDI-based loops playable via Tone.js, organized by genre.
// Each loop defines its notes so it can be previewed and dropped into the piano roll.

export interface LoopEntry {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  bars: number;
  key: string;
  type: 'melodic' | 'drum';
  description: string;
  // For melodic loops: MIDI notes [pitch, startBeat, durationBeats, velocity]
  notes?: [number, number, number, number][];
  // For drum loops: grid [padIndex][step] (16 steps per bar)
  drumGrid?: boolean[][];
}

export const LOOP_GENRES = ['Hip-Hop', 'R&B', 'Pop', 'EDM', 'Country', 'Lo-Fi', 'Trap', 'Jazz'];

export const LOOP_LIBRARY: LoopEntry[] = [
  // ── Hip-Hop ──────────────────────────────────────────────────────────────
  {
    id: 'hh-beat-1', name: 'Classic Boom Bap', genre: 'Hip-Hop', bpm: 90, bars: 1, key: 'C', type: 'drum',
    description: 'Kick-snare groove with open hat',
    drumGrid: [
      [true,false,false,false, false,false,false,false, true,false,false,false, false,false,false,false], // Kick
      [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false], // Snare
      [false,false,true,false,  true,false,true,false,  false,false,true,false,  true,false,true,false],  // Closed HH
      [false,false,false,false, false,false,false,true,  false,false,false,false, false,false,false,true], // Open HH
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
    ],
  },
  {
    id: 'hh-melody-1', name: 'Dusty Rhodes', genre: 'Hip-Hop', bpm: 90, bars: 2, key: 'A', type: 'melodic',
    description: 'Soulful electric piano loop',
    notes: [
      [69,0,0.5,90],[72,0.5,0.25,75],[71,1,0.5,85],[69,1.5,0.25,70],
      [67,2,1,80],[69,3,0.5,85],[72,3.5,0.5,90],
      [69,4,0.5,90],[72,4.5,0.25,75],[71,5,0.5,85],[69,5.5,0.25,70],
      [67,6,2,80],
    ],
  },
  // ── R&B ──────────────────────────────────────────────────────────────────
  {
    id: 'rnb-beat-1', name: 'Smooth Groove', genre: 'R&B', bpm: 85, bars: 1, key: 'C', type: 'drum',
    description: 'Soft kick with rimshot snare',
    drumGrid: [
      [true,false,false,false, false,false,false,false, true,false,true,false, false,false,false,false],
      [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,true],
      [true,false,true,false,   true,false,true,false,  true,false,true,false,   true,false,true,false],
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
    ],
  },
  {
    id: 'rnb-melody-1', name: 'Late Night Keys', genre: 'R&B', bpm: 85, bars: 2, key: 'Db', type: 'melodic',
    description: 'Warm chord stabs with melody',
    notes: [
      [61,0,0.5,80],[65,0,0.5,70],[68,0,0.5,65],
      [61,1,0.5,80],[65,1,0.5,70],[68,1,0.5,65],
      [61,2,1,85],[65,2,1,75],[68,2,1,70],
      [59,4,0.5,80],[63,4,0.5,70],[66,4,0.5,65],
      [59,5,0.5,80],[63,5,0.5,70],[66,5,0.5,65],
      [58,6,2,85],[62,6,2,75],[65,6,2,70],
    ],
  },
  // ── Pop ──────────────────────────────────────────────────────────────────
  {
    id: 'pop-beat-1', name: 'Pop Clap Beat', genre: 'Pop', bpm: 120, bars: 1, key: 'C', type: 'drum',
    description: 'Four-on-the-floor with clap',
    drumGrid: [
      [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false],
      [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false],
      [true,true,true,true,     true,true,true,true,    true,true,true,true,     true,true,true,true],
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      [true,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false], // Clap
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
    ],
  },
  {
    id: 'pop-melody-1', name: 'Bright Synth Lead', genre: 'Pop', bpm: 120, bars: 2, key: 'C', type: 'melodic',
    description: 'Catchy pop synth melody',
    notes: [
      [72,0,0.25,100],[74,0.25,0.25,90],[76,0.5,0.5,95],
      [74,1,0.25,85],[72,1.25,0.25,80],[71,1.5,0.5,85],
      [72,2,1,90],[76,3,1,95],
      [79,4,0.25,100],[78,4.25,0.25,90],[76,4.5,0.5,95],
      [74,5,0.25,85],[72,5.25,0.25,80],[71,5.5,0.5,85],
      [72,6,2,90],
    ],
  },
  // ── Lo-Fi ────────────────────────────────────────────────────────────────
  {
    id: 'lofi-beat-1', name: 'Chill Hop Beat', genre: 'Lo-Fi', bpm: 75, bars: 2, key: 'C', type: 'drum',
    description: 'Lazy swing groove',
    drumGrid: [
      [true,false,false,false, false,false,false,false, true,false,false,false, false,false,false,false],
      [false,false,false,false, true,false,false,true,  false,false,false,false, true,false,true,false],
      [false,true,false,true,   false,true,false,true,  false,true,false,true,   false,true,false,true],
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
    ],
  },
  {
    id: 'lofi-melody-1', name: 'Vinyl Piano', genre: 'Lo-Fi', bpm: 75, bars: 4, key: 'F', type: 'melodic',
    description: 'Warm lo-fi piano with space',
    notes: [
      [65,0,1,70],[69,0,1,60],[72,0,1,55],
      [65,2,0.5,65],[67,2.5,0.5,60],[69,3,1,70],
      [65,4,1,70],[69,4,1,60],[72,4,1,55],
      [64,6,0.5,65],[65,6.5,0.5,60],[67,7,1,70],
      [65,8,1,70],[69,8,1,60],[72,8,1,55],
      [74,10,0.5,65],[72,10.5,0.5,60],[71,11,1,70],
      [65,12,2,75],[67,12,2,65],[70,12,2,60],[74,12,2,55],
    ],
  },
  // ── Trap ─────────────────────────────────────────────────────────────────
  {
    id: 'trap-beat-1', name: 'Dark Trap', genre: 'Trap', bpm: 140, bars: 1, key: 'C', type: 'drum',
    description: 'Hard 808 with fast hi-hats',
    drumGrid: [
      [true,false,false,false, false,false,false,false, true,false,false,false, false,false,false,false],
      [false,false,false,false, false,false,false,false, false,false,false,false, true,false,false,false],
      [true,true,true,true, true,true,true,true, true,true,true,true, true,true,true,true], // Fast hats
      [false,false,false,false, false,false,false,true, false,false,false,false, false,false,false,true],
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
    ],
  },
  {
    id: 'trap-melody-1', name: 'Dark Bells', genre: 'Trap', bpm: 140, bars: 2, key: 'Cm', type: 'melodic',
    description: 'Eerie bell melody over minor chord',
    notes: [
      [60,0,0.25,90],[63,0.25,0.25,85],[65,0.5,0.5,90],
      [63,1,0.25,80],[60,1.25,0.25,75],[58,1.5,0.5,80],
      [60,2,1,85],[55,3,1,80],
      [58,4,0.25,90],[60,4.25,0.25,85],[63,4.5,0.5,90],
      [65,5,0.25,80],[63,5.25,0.25,75],[60,5.5,0.5,80],
      [55,6,2,85],
    ],
  },
  // ── EDM ──────────────────────────────────────────────────────────────────
  {
    id: 'edm-beat-1', name: 'EDM Drop', genre: 'EDM', bpm: 128, bars: 1, key: 'C', type: 'drum',
    description: 'Four-on-the-floor house kick',
    drumGrid: [
      [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false],
      [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false],
      [false,false,true,false,  false,false,true,false, false,false,true,false,  false,false,true,false],
      [false,true,false,false,  false,true,false,false, false,true,false,false,  false,true,false,false],
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
    ],
  },
  {
    id: 'edm-melody-1', name: 'Synth Pluck Riff', genre: 'EDM', bpm: 128, bars: 2, key: 'Am', type: 'melodic',
    description: 'Classic EDM synth pluck progression',
    notes: [
      [69,0,0.25,100],[72,0.25,0.25,95],[76,0.5,0.25,100],[77,0.75,0.25,90],
      [76,1,0.25,95],[72,1.25,0.25,90],[69,1.5,0.5,95],
      [69,2,0.25,100],[72,2.25,0.25,95],[76,2.5,0.25,100],[77,2.75,0.25,90],
      [79,3,1,95],
      [77,4,0.25,100],[76,4.25,0.25,95],[74,4.5,0.25,100],[72,4.75,0.25,90],
      [71,5,0.25,95],[69,5.25,0.25,90],[67,5.5,0.5,95],
      [69,6,2,100],
    ],
  },
  // ── Country ───────────────────────────────────────────────────────────────
  {
    id: 'country-beat-1', name: 'Country Shuffle', genre: 'Country', bpm: 100, bars: 2, key: 'G', type: 'drum',
    description: 'Shuffle groove with rim and brush',
    drumGrid: [
      [true,false,false,false, false,false,false,false, true,false,false,false, false,false,false,false],
      [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false],
      [false,true,false,true,   false,true,false,true,  false,true,false,true,   false,true,false,true],
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      [false,false,false,false, false,false,false,false, true,false,false,false, false,false,false,false],
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
    ],
  },
  {
    id: 'country-melody-1', name: 'Twang Lead', genre: 'Country', bpm: 100, bars: 2, key: 'G', type: 'melodic',
    description: 'Classic country guitar lick',
    notes: [
      [67,0,0.25,90],[69,0.25,0.25,85],[71,0.5,0.25,90],[72,0.75,0.25,85],
      [74,1,0.5,95],[72,1.5,0.25,80],[71,1.75,0.25,75],
      [69,2,1,85],[67,3,1,80],
      [67,4,0.25,90],[69,4.25,0.25,85],[71,4.5,0.25,90],[72,4.75,0.25,85],
      [74,5,0.5,95],[76,5.5,0.5,90],[74,6,2,85],
    ],
  },
  // ── Jazz ─────────────────────────────────────────────────────────────────
  {
    id: 'jazz-beat-1', name: 'Jazz Swing', genre: 'Jazz', bpm: 120, bars: 2, key: 'C', type: 'drum',
    description: 'Jazz ride cymbal with brushes',
    drumGrid: [
      [true,false,false,false, false,false,false,false, true,false,false,true, false,false,false,false],
      [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false],
      [true,false,true,true,    true,false,true,true,   true,false,true,true,    true,false,true,true],
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
      Array(16).fill(false), Array(16).fill(false), Array(16).fill(false), Array(16).fill(false),
    ],
  },
  {
    id: 'jazz-melody-1', name: 'II-V-I Changes', genre: 'Jazz', bpm: 120, bars: 4, key: 'C', type: 'melodic',
    description: 'Classic jazz ii-V-I chord melody',
    notes: [
      // Dm7
      [62,0,0.5,80],[65,0,0.5,70],[69,0,0.5,65],[72,0,0.5,60],
      [69,0.5,0.5,75],[67,1,0.5,70],[65,1.5,0.5,75],
      // G7
      [67,2,0.5,80],[71,2,0.5,70],[74,2,0.5,65],[77,2,0.5,60],
      [74,2.5,0.5,75],[72,3,0.5,70],[71,3.5,0.5,75],
      // Cmaj7
      [60,4,0.5,85],[64,4,0.5,75],[67,4,0.5,70],[71,4,0.5,65],
      [71,4.5,1,80],[69,5.5,0.5,75],[67,6,2,80],
      // Turnaround
      [64,8,0.5,75],[65,8.5,0.5,70],[67,9,0.5,75],[69,9.5,0.5,80],
      [71,10,2,85],
    ],
  },
];
