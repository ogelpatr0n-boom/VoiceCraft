import { useState, useCallback, useEffect } from 'react';
import { LOOP_LIBRARY, LOOP_GENRES, type LoopEntry } from '../../data/loop-library';
import { loopPreviewEngine } from '../../audio/loop-preview-engine';
import { useTimelineStore } from '../../stores/timeline-store';
import { usePatternStore } from '../../stores/pattern-store';

export function LoopBrowserView() {
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<'all' | 'melodic' | 'drum'>('all');
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  const addTrack = useTimelineStore(s => s.addTrack);
  const addClip = useTimelineStore(s => s.addClip);
  const tracks = useTimelineStore(s => s.tracks);
  const bpm = usePatternStore(s => s.globalBpm);
  const createDrumPattern = usePatternStore(s => s.createDrumPattern);
  const setDrumGrid = usePatternStore(s => s.setDrumGrid);
  const createMelodicPattern = usePatternStore(s => s.createMelodicPattern);
  const addNote = usePatternStore(s => s.addNote);

  const genres = ['All', ...LOOP_GENRES];

  const filtered = LOOP_LIBRARY.filter(loop => {
    if (selectedGenre !== 'All' && loop.genre !== selectedGenre) return false;
    if (selectedType !== 'all' && loop.type !== selectedType) return false;
    if (search && !loop.name.toLowerCase().includes(search.toLowerCase()) &&
        !loop.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handlePreview = useCallback(async (loop: LoopEntry) => {
    if (playingId === loop.id) {
      loopPreviewEngine.stop();
      setPlayingId(null);
    } else {
      setPlayingId(loop.id);
      await loopPreviewEngine.preview(loop);
      // Clear playing state after auto-stop (bars * 2 measures)
      const ms = (loop.bars * 2 * 60_000 * 4) / loop.bpm;
      setTimeout(() => setPlayingId(prev => prev === loop.id ? null : prev), ms + 500);
    }
  }, [playingId]);

  const handleAddToTimeline = useCallback((loop: LoopEntry) => {
    const beatsPerBar = 4;
    const durationBeats = loop.bars * beatsPerBar;

    if (loop.type === 'drum' && loop.drumGrid) {
      // Create a drum pattern in pattern store, then add MIDI clip to timeline
      const patId = createDrumPattern('loop-' + loop.id, loop.name);
      setDrumGrid(patId, loop.drumGrid);

      let trackId = tracks.find(t => t.name === 'Drums' || t.name.toLowerCase().includes('drum'))?.id;
      if (!trackId) trackId = addTrack('midi', 'Drums');

      addClip({
        trackId,
        type: 'midi',
        name: loop.name,
        startBeat: 0,
        duration: durationBeats,
        color: '#f7dc6f',
        notes: [],
      });

    } else if (loop.type === 'melodic' && loop.notes) {
      // Convert loop notes to MidiNote format and add to timeline as MIDI clip
      const midiNotes = loop.notes.map(([pitch, start, duration, velocity]) => ({
        id: crypto.randomUUID(),
        pitch,
        start,
        duration,
        velocity: velocity ?? 80,
      }));

      let trackId = tracks.find(t => t.type === 'midi' && t.name !== 'Drums')?.id;
      if (!trackId) trackId = addTrack('midi', loop.genre + ' Loop');

      addClip({
        trackId,
        type: 'midi',
        name: loop.name,
        startBeat: 0,
        duration: durationBeats,
        color: '#00d4ff',
        notes: midiNotes,
      });
    }

    setAddedId(loop.id);
    setTimeout(() => setAddedId(null), 2000);
  }, [tracks, addTrack, addClip, createDrumPattern, setDrumGrid, addNote]);

  useEffect(() => {
    return () => { loopPreviewEngine.stop(); };
  }, []);

  const bpmColor = (loopBpm: number) => {
    const diff = Math.abs(loopBpm - bpm);
    if (diff <= 5) return '#58d68d';
    if (diff <= 20) return '#f7dc6f';
    return '#aaa';
  };

  return (
    <div className="loop-browser">
      {/* Header */}
      <div className="loop-browser__header">
        <h2 className="loop-browser__title">Loop Library</h2>
        <p className="loop-browser__subtitle">
          {LOOP_LIBRARY.length} royalty-free loops — click to preview, + to add to timeline
        </p>
      </div>

      {/* Filters */}
      <div className="loop-browser__filters">
        <input
          className="loop-browser__search"
          type="text"
          placeholder="Search loops..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="loop-browser__type-tabs">
          {(['all', 'melodic', 'drum'] as const).map(t => (
            <button
              key={t}
              className={`loop-browser__type-tab ${selectedType === t ? 'loop-browser__type-tab--active' : ''}`}
              onClick={() => setSelectedType(t)}
            >
              {t === 'all' ? 'All' : t === 'melodic' ? 'Melodic' : 'Drum'}
            </button>
          ))}
        </div>
      </div>

      {/* Genre chips */}
      <div className="loop-browser__genres">
        {genres.map(genre => (
          <button
            key={genre}
            className={`loop-browser__genre-chip ${selectedGenre === genre ? 'loop-browser__genre-chip--active' : ''}`}
            onClick={() => setSelectedGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Loop list */}
      <div className="loop-browser__list">
        {filtered.length === 0 ? (
          <div className="loop-browser__empty">No loops match your filters.</div>
        ) : (
          filtered.map(loop => (
            <div
              key={loop.id}
              className={`loop-browser__item ${playingId === loop.id ? 'loop-browser__item--playing' : ''}`}
            >
              {/* Play button */}
              <button
                className={`loop-browser__play-btn ${playingId === loop.id ? 'loop-browser__play-btn--active' : ''}`}
                onClick={() => handlePreview(loop)}
                title={playingId === loop.id ? 'Stop' : 'Preview'}
              >
                {playingId === loop.id ? '■' : '▶'}
              </button>

              {/* Info */}
              <div className="loop-browser__item-info">
                <div className="loop-browser__item-name">{loop.name}</div>
                <div className="loop-browser__item-meta">
                  <span className="loop-browser__tag loop-browser__tag--genre">{loop.genre}</span>
                  <span className={`loop-browser__tag loop-browser__tag--type ${loop.type}`}>{loop.type}</span>
                  <span className="loop-browser__tag loop-browser__tag--key">{loop.key}</span>
                  <span className="loop-browser__tag loop-browser__tag--bars">{loop.bars}bar{loop.bars > 1 ? 's' : ''}</span>
                  <span className="loop-browser__item-desc">{loop.description}</span>
                </div>
              </div>

              {/* BPM + Add */}
              <div className="loop-browser__item-actions">
                <span className="loop-browser__bpm" style={{ color: bpmColor(loop.bpm) }}>
                  {loop.bpm} BPM
                </span>
                <button
                  className={`loop-browser__add-btn ${addedId === loop.id ? 'loop-browser__add-btn--added' : ''}`}
                  onClick={() => handleAddToTimeline(loop)}
                  title="Add to timeline"
                >
                  {addedId === loop.id ? '✓' : '+'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Status bar */}
      <div className="loop-browser__status">
        <span>{filtered.length} of {LOOP_LIBRARY.length} loops</span>
        {playingId && (
          <span className="loop-browser__status-playing">
            ♪ Previewing — click ■ to stop
          </span>
        )}
        <span>Project BPM: <strong>{bpm}</strong> — BPM match: <span style={{ color: '#58d68d' }}>●</span> close <span style={{ color: '#f7dc6f' }}>●</span> near <span style={{ color: '#aaa' }}>●</span> different</span>
      </div>
    </div>
  );
}
