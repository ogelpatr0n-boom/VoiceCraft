import { useState, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import { PROGRESSIONS, MOODS, GENRES, type Progression, type ChordDef } from '../../data/chord-library';
import { useTimelineStore } from '../../stores/timeline-store';
import { usePatternStore } from '../../stores/pattern-store';
import type { MidiNote } from '../../audio/midi/midi-event';

// Transpose a chord to a different root key
function transposeChord(chord: ChordDef, semitones: number): ChordDef {
  return { ...chord, root: chord.root + semitones };
}

function chordToMidiNotes(chord: ChordDef, startBeat: number): MidiNote[] {
  return chord.intervals.map(interval => ({
    id: crypto.randomUUID(),
    pitch: chord.root + interval,
    start: startBeat,
    duration: chord.duration,
    velocity: 80,
  }));
}

const KEYS = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const KEY_OFFSETS: Record<string,number> = {
  C:0, Db:1, D:2, Eb:3, E:4, F:5, 'F#':6, G:7, Ab:8, A:9, Bb:10, B:11,
};

// Octave-4 root for each key (MIDI 60 = C4)
const KEY_BASE: Record<string,number> = {
  C:60, Db:61, D:62, Eb:63, E:64, F:65, 'F#':66, G:67, Ab:68, A:69, Bb:70, B:71,
};

// Play a chord preview with PolySynth
let previewSynth: Tone.PolySynth | null = null;
function getPreviewSynth() {
  if (!previewSynth) {
    previewSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 1.2 },
    }).toDestination();
    previewSynth.volume.value = -8;
  }
  return previewSynth;
}

const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function midiToName(midi: number) {
  return NOTES[midi % 12] + (Math.floor(midi / 12) - 1);
}

function ChordPill({ chord, isPlaying, onClick, onPlay }: {
  chord: ChordDef;
  isPlaying: boolean;
  onClick: () => void;
  onPlay: () => void;
}) {
  return (
    <div className={`chord-pill ${isPlaying ? 'chord-pill--playing' : ''}`}>
      <button className="chord-pill__play" onClick={onPlay} title="Preview chord">
        {isPlaying ? '■' : '▶'}
      </button>
      <div className="chord-pill__info" onClick={onClick}>
        <div className="chord-pill__name">{chord.name}</div>
        <div className="chord-pill__notes">
          {chord.intervals.map(i => NOTES[(chord.root + i) % 12]).join(' · ')}
        </div>
        <div className="chord-pill__dur">{chord.duration}b</div>
      </div>
    </div>
  );
}

export function ChordBuilderView() {
  const [selectedMood, setSelectedMood] = useState<string>('All');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedKey, setSelectedKey] = useState<string>('C');
  const [playingChordIdx, setPlayingChordIdx] = useState<number | null>(null);
  const [playingProgId, setPlayingProgId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [previewProgId, setPreviewProgId] = useState<string | null>(null);
  const seqRef = useRef<Tone.Sequence | null>(null);

  const addTrack = useTimelineStore(s => s.addTrack);
  const addClip  = useTimelineStore(s => s.addClip);
  const tracks   = useTimelineStore(s => s.tracks);
  const bpm      = usePatternStore(s => s.globalBpm);

  const filtered = PROGRESSIONS.filter(p => {
    if (selectedMood !== 'All' && p.mood !== selectedMood) return false;
    if (selectedGenre !== 'All' && p.genre !== selectedGenre) return false;
    return true;
  });

  // Transpose a progression to the selected key
  function transposed(prog: Progression): Progression {
    // Find the original key root from the first chord name
    // We use semitone shift relative to C (the data is authored in C)
    const shift = KEY_OFFSETS[selectedKey] ?? 0;
    return {
      ...prog,
      chords: prog.chords.map(ch => transposeChord(ch, shift)),
    };
  }

  const previewChord = useCallback(async (chord: ChordDef, idx: number, progId: string) => {
    await Tone.start();
    const synth = getPreviewSynth();
    const notes = chord.intervals.map(i => midiToName(chord.root + i));
    synth.triggerAttackRelease(notes, '2n');
    setPlayingChordIdx(idx);
    setPlayingProgId(progId);
    setTimeout(() => {
      setPlayingChordIdx(prev => prev === idx ? null : prev);
      setPlayingProgId(prev => prev === progId ? null : prev);
    }, 1500);
  }, []);

  const playProgression = useCallback(async (prog: Progression) => {
    await Tone.start();
    if (previewProgId === prog.id) {
      seqRef.current?.stop();
      seqRef.current?.dispose();
      seqRef.current = null;
      setPreviewProgId(null);
      return;
    }
    seqRef.current?.stop();
    seqRef.current?.dispose();

    const t = transposed(prog);
    Tone.getTransport().bpm.value = prog.bpm;
    const synth = getPreviewSynth();

    const totalBeats = t.chords.reduce((a, c) => a + c.duration, 0);

    // Build events as objects with `time` property (beats as quarter-note string)
    type PartEvent = { time: string; chord: ChordDef };
    let beat = 0;
    const events: PartEvent[] = [];
    for (const ch of t.chords) {
      const measure = Math.floor(beat / 4);
      const quarter = beat % 4;
      events.push({ time: `${measure}:${quarter}`, chord: ch });
      beat += ch.duration;
    }

    const part = new Tone.Part<PartEvent>((time, ev) => {
      const notes = ev.chord.intervals.map((i: number) => midiToName(ev.chord.root + i));
      synth.triggerAttackRelease(notes, `${ev.chord.duration * 0.9}n`, time);
    }, events);

    part.loop = true;
    part.loopEnd = `${totalBeats / 4}m`;
    part.start(0);
    seqRef.current = part as unknown as Tone.Sequence;
    setPreviewProgId(prog.id);

    if (Tone.getTransport().state !== 'started') {
      Tone.getTransport().start();
    }
  }, [previewProgId, selectedKey]);

  const addToTimeline = useCallback((prog: Progression) => {
    const t = transposed(prog);
    let totalBeat = 0;
    const allNotes: MidiNote[] = [];
    for (const ch of t.chords) {
      allNotes.push(...chordToMidiNotes(ch, totalBeat));
      totalBeat += ch.duration;
    }

    let trackId = tracks.find(tr => tr.type === 'midi' && tr.name !== 'Drums')?.id;
    if (!trackId) trackId = addTrack('midi', 'Chords');

    addClip({
      trackId,
      type: 'midi',
      name: `${selectedKey} ${prog.name}`,
      startBeat: 0,
      duration: totalBeat,
      color: '#bb8fce',
      notes: allNotes,
    });

    setAddedId(prog.id);
    setTimeout(() => setAddedId(null), 2000);
  }, [tracks, addTrack, addClip, selectedKey]);

  return (
    <div className="chord-builder">
      {/* Header */}
      <div className="chord-builder__header">
        <h2 className="chord-builder__title">Chord Progression Builder</h2>
        <p className="chord-builder__subtitle">
          {PROGRESSIONS.length} progressions — preview and drop to timeline as MIDI
        </p>
      </div>

      {/* Key + Filters */}
      <div className="chord-builder__filters">
        <div className="chord-builder__key-row">
          <span className="chord-builder__filter-label">Key</span>
          <div className="chord-builder__keys">
            {KEYS.map(k => (
              <button
                key={k}
                className={`chord-builder__key-btn ${selectedKey === k ? 'chord-builder__key-btn--active' : ''}`}
                onClick={() => setSelectedKey(k)}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="chord-builder__filter-row">
          <div className="chord-builder__filter-group">
            <span className="chord-builder__filter-label">Mood</span>
            <div className="chord-builder__chips">
              {['All', ...MOODS].map(m => (
                <button
                  key={m}
                  className={`chord-builder__chip ${selectedMood === m ? 'chord-builder__chip--active' : ''}`}
                  onClick={() => setSelectedMood(m)}
                >{m}</button>
              ))}
            </div>
          </div>
          <div className="chord-builder__filter-group">
            <span className="chord-builder__filter-label">Genre</span>
            <div className="chord-builder__chips">
              {['All', ...GENRES].map(g => (
                <button
                  key={g}
                  className={`chord-builder__chip ${selectedGenre === g ? 'chord-builder__chip--active' : ''}`}
                  onClick={() => setSelectedGenre(g)}
                >{g}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Progression list */}
      <div className="chord-builder__list">
        {filtered.length === 0 && (
          <div className="chord-builder__empty">No progressions match your filters.</div>
        )}
        {filtered.map(prog => {
          const t = transposed(prog);
          return (
            <div key={prog.id} className={`chord-builder__prog ${previewProgId === prog.id ? 'chord-builder__prog--playing' : ''}`}>
              {/* Prog header */}
              <div className="chord-builder__prog-header">
                <div className="chord-builder__prog-info">
                  <div className="chord-builder__prog-name">{prog.name}</div>
                  <div className="chord-builder__prog-meta">
                    <span className="chord-builder__badge chord-builder__badge--mood">{prog.mood}</span>
                    <span className="chord-builder__badge chord-builder__badge--genre">{prog.genre}</span>
                    <span className="chord-builder__badge">{prog.bpm} BPM</span>
                    <span className="chord-builder__badge">{prog.bars} bars</span>
                  </div>
                </div>
                <div className="chord-builder__prog-actions">
                  <button
                    className={`chord-builder__play-btn ${previewProgId === prog.id ? 'chord-builder__play-btn--active' : ''}`}
                    onClick={() => playProgression(prog)}
                    title={previewProgId === prog.id ? 'Stop' : 'Play progression'}
                  >
                    {previewProgId === prog.id ? '■' : '▶'}
                  </button>
                  <button
                    className={`chord-builder__add-btn ${addedId === prog.id ? 'chord-builder__add-btn--added' : ''}`}
                    onClick={() => addToTimeline(prog)}
                    title="Add to timeline"
                  >
                    {addedId === prog.id ? '✓ Added' : '+ Timeline'}
                  </button>
                </div>
              </div>

              {/* Chord pills */}
              <div className="chord-builder__chords">
                {t.chords.map((ch, i) => (
                  <ChordPill
                    key={i}
                    chord={ch}
                    isPlaying={playingChordIdx === i && playingProgId === prog.id}
                    onClick={() => {}}
                    onPlay={() => previewChord(ch, i, prog.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="chord-builder__status">
        <span>{filtered.length} of {PROGRESSIONS.length} progressions · Key: <strong>{selectedKey}</strong></span>
        {previewProgId && <span className="chord-builder__status-playing">♪ Playing — click ■ to stop</span>}
      </div>
    </div>
  );
}
