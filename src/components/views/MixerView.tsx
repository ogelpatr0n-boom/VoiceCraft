import { useState, useCallback } from 'react';
import * as Tone from 'tone';
import { useInstrumentStore, DEFAULT_FX, type TrackFxParams } from '../../stores/instrument-store';
import { TransportBar } from '../controls/TransportBar';

// Rotary knob — tiny self-contained component
function Knob({ label, value, min, max, step = 0.01, onChange, unit = '', color = 'var(--accent-primary)' }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; unit?: string; color?: string;
}) {
  const pct = (value - min) / (max - min);
  // 270° sweep starting from -135°
  const angle = -135 + pct * 270;
  return (
    <div className="mix-knob">
      <div
        className="mix-knob__dial"
        style={{ '--knob-color': color, '--knob-angle': `${angle}deg` } as React.CSSProperties}
        title={`${label}: ${value.toFixed(1)}${unit}`}
      >
        <div className="mix-knob__indicator" />
      </div>
      <input
        className="mix-knob__input"
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        title={`${label}: ${value.toFixed(1)}${unit}`}
      />
      <span className="mix-knob__label">{label}</span>
    </div>
  );
}

// Vertical fader
function VFader({ value, min, max, onChange, color }: {
  value: number; min: number; max: number; onChange: (v: number) => void; color: string;
}) {
  return (
    <div className="mix-fader">
      <input
        type="range" min={min} max={max} step={0.5} value={value}
        className="mix-fader__slider"
        style={{ accentColor: color }}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
      <span className="mix-fader__val">{value >= 0 ? '+' : ''}{value.toFixed(0)}</span>
    </div>
  );
}

// Simple animated VU bar
function VU({ active }: { active: boolean }) {
  return (
    <div className="mix-vu">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className={`mix-vu__bar ${active && i < 8 ? 'mix-vu__bar--on' : ''} ${active && i >= 8 ? 'mix-vu__bar--peak' : ''}`} />
      ))}
    </div>
  );
}

const TYPE_ICONS: Record<string, string> = {
  synth: '🎹', drums: '🥁', sampler: '🎵', bass: '🎸',
  fm: '📡', arpeggiator: '🎶', 'plucked-string': '🪕', 'bowed-string': '🎻', 'pedal-steel': '🤠',
};

const TRACK_COLORS = ['#00d4ff','#ff6b35','#4ecdc4','#f7dc6f','#bb8fce','#58d68d','#ec7063','#5dade2'];

export function MixerView() {
  const instruments = useInstrumentStore(s => s.instruments);
  const updateInstrument = useInstrumentStore(s => s.updateInstrument);
  const updateInstrumentFx = useInstrumentStore(s => s.updateInstrumentFx);
  const addInstrument = useInstrumentStore(s => s.addInstrument);

  const [masterVol, setMasterVol] = useState(0);
  const [expandedFx, setExpandedFx] = useState<string | null>(null);

  const handleMasterVol = useCallback((v: number) => {
    setMasterVol(v);
    Tone.getDestination().volume.value = v;
  }, []);

  const toggleFx = (id: string) => setExpandedFx(prev => prev === id ? null : id);

  const resetFx = (id: string) => updateInstrumentFx(id, { ...DEFAULT_FX });

  return (
    <div className="mixer-view">
      {/* Transport */}
      <div className="mixer-view__transport">
        <TransportBar />
        <button className="btn btn--sm btn--primary" onClick={() => addInstrument('synth')}>+ Add Synth</button>
        <button className="btn btn--sm" onClick={() => addInstrument('drums')}>+ Drums</button>
      </div>

      {/* Channel strips */}
      <div className="mixer-strips">
        {instruments.length === 0 && (
          <div className="mixer-strips__empty">
            Add instruments from the Instruments view to see them here.
          </div>
        )}

        {instruments.map((inst, idx) => {
          const color = TRACK_COLORS[idx % TRACK_COLORS.length];
          const fxOpen = expandedFx === inst.id;
          const fx = inst.fx ?? { ...DEFAULT_FX };

          return (
            <div key={inst.id} className={`mixer-strip ${fxOpen ? 'mixer-strip--expanded' : ''}`} style={{ '--strip-color': color } as React.CSSProperties}>
              {/* Strip header */}
              <div className="mixer-strip__top" style={{ borderTopColor: color }}>
                <span className="mixer-strip__icon">{TYPE_ICONS[inst.type] ?? '🎵'}</span>
                <span className="mixer-strip__name">{inst.name}</span>
              </div>

              {/* FX section (collapsed: just send knobs) */}
              <div className="mixer-strip__sends">
                <Knob label="REV" value={fx.reverbWet} min={0} max={1} step={0.01}
                  onChange={v => updateInstrumentFx(inst.id, { reverbWet: v })} color="#bb8fce" />
                <Knob label="DLY" value={fx.delayWet} min={0} max={1} step={0.01}
                  onChange={v => updateInstrumentFx(inst.id, { delayWet: v })} color="#4ecdc4" />
              </div>

              {/* EQ section */}
              <div className="mixer-strip__eq">
                <Knob label="HI" value={fx.eqHigh} min={-12} max={12} step={0.5}
                  onChange={v => updateInstrumentFx(inst.id, { eqHigh: v })} unit="dB" color="#f7dc6f" />
                <Knob label="MID" value={fx.eqMid} min={-12} max={12} step={0.5}
                  onChange={v => updateInstrumentFx(inst.id, { eqMid: v })} unit="dB" color="#f7dc6f" />
                <Knob label="LO" value={fx.eqLow} min={-12} max={12} step={0.5}
                  onChange={v => updateInstrumentFx(inst.id, { eqLow: v })} unit="dB" color="#f7dc6f" />
              </div>

              {/* Pan */}
              <div className="mixer-strip__pan">
                <input type="range" min={-1} max={1} step={0.01} value={inst.pan}
                  onChange={e => updateInstrument(inst.id, { pan: parseFloat(e.target.value) })}
                  className="mixer-strip__pan-slider" style={{ accentColor: color }} />
                <span className="mixer-strip__pan-label">
                  {inst.pan === 0 ? 'C' : inst.pan < 0 ? `L${Math.round(-inst.pan * 100)}` : `R${Math.round(inst.pan * 100)}`}
                </span>
              </div>

              {/* Fader + VU */}
              <div className="mixer-strip__fader-row">
                <VU active={!inst.muted} />
                <VFader value={inst.volume} min={-40} max={6} onChange={v => updateInstrument(inst.id, { volume: v })} color={color} />
              </div>

              {/* Mute / Solo / FX expand */}
              <div className="mixer-strip__buttons">
                <button
                  className={`mixer-strip__btn ${inst.muted ? 'mixer-strip__btn--mute-on' : ''}`}
                  onClick={() => updateInstrument(inst.id, { muted: !inst.muted })}
                >M</button>
                <button
                  className={`mixer-strip__btn ${inst.solo ? 'mixer-strip__btn--solo-on' : ''}`}
                  onClick={() => updateInstrument(inst.id, { solo: !inst.solo })}
                >S</button>
                <button
                  className={`mixer-strip__btn ${fxOpen ? 'mixer-strip__btn--fx-on' : ''}`}
                  onClick={() => toggleFx(inst.id)}
                  title="Show FX detail"
                >FX</button>
              </div>

              {/* Expanded FX panel */}
              {fxOpen && (
                <div className="mixer-strip__fx-panel">
                  <div className="mixer-strip__fx-row">
                    <span className="mixer-strip__fx-label">Reverb</span>
                    <Knob label="Decay" value={fx.reverbDecay} min={0.1} max={10} step={0.1}
                      onChange={v => updateInstrumentFx(inst.id, { reverbDecay: v })} unit="s" color="#bb8fce" />
                    <Knob label="Wet" value={fx.reverbWet} min={0} max={1}
                      onChange={v => updateInstrumentFx(inst.id, { reverbWet: v })} color="#bb8fce" />
                  </div>
                  <div className="mixer-strip__fx-row">
                    <span className="mixer-strip__fx-label">Delay</span>
                    <Knob label="Time" value={fx.delayTime} min={0.05} max={1} step={0.05}
                      onChange={v => updateInstrumentFx(inst.id, { delayTime: v })} unit="s" color="#4ecdc4" />
                    <Knob label="Fdbk" value={fx.delayFeedback} min={0} max={0.95}
                      onChange={v => updateInstrumentFx(inst.id, { delayFeedback: v })} color="#4ecdc4" />
                    <Knob label="Wet" value={fx.delayWet} min={0} max={1}
                      onChange={v => updateInstrumentFx(inst.id, { delayWet: v })} color="#4ecdc4" />
                  </div>
                  <div className="mixer-strip__fx-row">
                    <span className="mixer-strip__fx-label">Comp</span>
                    <button
                      className={`mixer-strip__btn ${fx.compEnabled ? 'mixer-strip__btn--fx-on' : ''}`}
                      onClick={() => updateInstrumentFx(inst.id, { compEnabled: !fx.compEnabled })}
                    >{fx.compEnabled ? 'ON' : 'OFF'}</button>
                    <Knob label="Thresh" value={fx.compThreshold} min={-60} max={0} step={1}
                      onChange={v => updateInstrumentFx(inst.id, { compThreshold: v })} unit="dB" color="#ff6b35" />
                    <Knob label="Ratio" value={fx.compRatio} min={1} max={20} step={0.5}
                      onChange={v => updateInstrumentFx(inst.id, { compRatio: v })} color="#ff6b35" />
                  </div>
                  <button className="mixer-strip__reset" onClick={() => resetFx(inst.id)}>
                    Reset FX
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Master strip */}
        <div className="mixer-strip mixer-strip--master">
          <div className="mixer-strip__top" style={{ borderTopColor: '#ff6b35' }}>
            <span className="mixer-strip__icon">🔊</span>
            <span className="mixer-strip__name">Master</span>
          </div>
          <div className="mixer-strip__sends" style={{ height: 52 }} />
          <div className="mixer-strip__eq" style={{ height: 52 }} />
          <div className="mixer-strip__pan" style={{ height: 28 }} />
          <div className="mixer-strip__fader-row">
            <VU active />
            <VU active />
            <VFader value={masterVol} min={-40} max={6} onChange={handleMasterVol} color="#ff6b35" />
          </div>
          <div className="mixer-strip__buttons">
            <span className="mixer-strip__db">{masterVol >= 0 ? '+' : ''}{masterVol.toFixed(0)} dB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
