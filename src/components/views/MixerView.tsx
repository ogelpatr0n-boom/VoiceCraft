import { useCallback } from 'react';
import { useProjectStore } from '../../stores/project-store';
import { Fader } from '../controls/Fader';
import { VuMeter } from '../controls/VuMeter';
import { TransportBar } from '../controls/TransportBar';

const TRACK_COLORS = ['#00d4ff', '#ff6b35', '#4caf50', '#9c27b0', '#ffc107', '#ff4444'];

export function MixerView() {
  const tracks = useProjectStore(s => s.tracks);
  const addTrack = useProjectStore(s => s.addTrack);
  const updateTrack = useProjectStore(s => s.updateTrack);
  const removeTrack = useProjectStore(s => s.removeTrack);

  const handleAddTrack = useCallback(() => {
    const idx = tracks.length;
    addTrack({
      id: crypto.randomUUID(),
      name: `Track ${idx + 1}`,
      color: TRACK_COLORS[idx % TRACK_COLORS.length],
      gain: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      hasBuffer: false,
      duration: 0,
    });
  }, [tracks.length, addTrack]);

  return (
    <div className="mixer-view">
      <div className="panel">
        <div className="flex items-center justify-between">
          <TransportBar />
          <button className="btn btn--sm btn--primary" onClick={handleAddTrack}>
            + Add Track
          </button>
        </div>
      </div>

      <div className="panel" style={{ flex: 1, overflow: 'auto' }}>
        {tracks.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height: '100%', minHeight: 200 }}>
            <div className="text-center">
              <div className="text-muted text-lg">No tracks yet</div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>Click "Add Track" to create a new track</div>
            </div>
          </div>
        ) : (
          <div className="mixer">
            {tracks.map(track => (
              <div key={track.id} className="track-strip" style={{ borderTopColor: track.color, borderTopWidth: 3 }}>
                <span className="track-strip__name">{track.name}</span>

                <div className="track-strip__buttons">
                  <button
                    className={`track-strip__btn track-strip__btn--mute ${track.muted ? 'active' : ''}`}
                    onClick={() => updateTrack(track.id, { muted: !track.muted })}
                  >M</button>
                  <button
                    className={`track-strip__btn track-strip__btn--solo ${track.solo ? 'active' : ''}`}
                    onClick={() => updateTrack(track.id, { solo: !track.solo })}
                  >S</button>
                </div>

                <div className="flex gap-1 items-end">
                  <VuMeter level={track.muted ? 0 : track.gain * 0.5} height={100} />
                  <Fader value={track.gain} min={0} max={1.5} height={100} onChange={v => updateTrack(track.id, { gain: v })} />
                </div>

                <div className="flex flex-col items-center gap-1">
                  <input
                    type="range" min={-1} max={1} step={0.01} value={track.pan}
                    onChange={e => updateTrack(track.id, { pan: parseFloat(e.target.value) })}
                    style={{ width: 60, accentColor: track.color }}
                  />
                  <span className="text-xs text-muted">Pan</span>
                </div>

                <button className="btn btn--sm btn--danger" onClick={() => removeTrack(track.id)} style={{ fontSize: '0.65rem' }}>
                  Remove
                </button>
              </div>
            ))}

            {/* Master Strip */}
            <div className="track-strip" style={{ borderTopColor: 'var(--accent-orange)', borderTopWidth: 3, background: 'var(--bg-elevated)' }}>
              <span className="track-strip__name" style={{ fontWeight: 700 }}>Master</span>
              <div style={{ height: 20 }} />
              <div className="flex gap-1 items-end">
                <VuMeter level={0.5} height={100} />
                <VuMeter level={0.45} height={100} />
              </div>
              <Fader value={1} min={0} max={1.5} height={100} onChange={() => {}} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
