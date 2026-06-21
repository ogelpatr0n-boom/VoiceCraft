import { useCallback, useRef, useState } from 'react';
import { useAudioStore } from '../../stores/audio-store';
import { getEngine } from '../../audio/engine';
import { NoteDisplay } from '../pitch/NoteDisplay';
import { CentsMeter } from '../pitch/CentsMeter';
import { Knob } from '../controls/Knob';
import { KeySelector } from '../controls/KeySelector';
import { VuMeter } from '../controls/VuMeter';

// ─── Auto-tune presets ────────────────────────────────────────────────────────
const TUNE_PRESETS = [
  { label: 'Off',     retuneSpeed: 50,  amount: 0,   humanize: 0,  enabled: false },
  { label: 'Subtle',  retuneSpeed: 200, amount: 40,  humanize: 40, enabled: true  },
  { label: 'Natural', retuneSpeed: 100, amount: 80,  humanize: 20, enabled: true  },
  { label: 'T-Pain',  retuneSpeed: 10,  amount: 100, humanize: 5,  enabled: true  },
  { label: 'Robotic', retuneSpeed: 0,   amount: 100, humanize: 0,  enabled: true  },
] as const;

// ─── Vocal FX presets ─────────────────────────────────────────────────────────
interface VocalFx {
  label: string;
  icon: string;
  description: string;
  // Tone.js effect params applied to EffectsPanel / engine chain
  reverb: { wet: number; decay: number };
  delay:  { wet: number; delayTime: number; feedback: number };
  eq:     { low: number; mid: number; high: number };
  distortion: number; // 0–1
}

const VOCAL_FX_PRESETS: VocalFx[] = [
  {
    label: 'Clean',      icon: '✦',  description: 'No effects — raw voice',
    reverb: { wet: 0,    decay: 1.5 }, delay: { wet: 0,    delayTime: 0.25, feedback: 0.3 },
    eq: { low: 0, mid: 0, high: 0 }, distortion: 0,
  },
  {
    label: 'Studio',     icon: '🎙', description: 'Warm room reverb, polished',
    reverb: { wet: 0.2,  decay: 1.5 }, delay: { wet: 0,    delayTime: 0.25, feedback: 0.3 },
    eq: { low: 2, mid: 0, high: 1 }, distortion: 0,
  },
  {
    label: 'Cathedral',  icon: '⛪', description: 'Big hall reverb, ethereal',
    reverb: { wet: 0.7,  decay: 6   }, delay: { wet: 0.1,  delayTime: 0.5,  feedback: 0.4 },
    eq: { low: 0, mid: -2, high: 2 }, distortion: 0,
  },
  {
    label: 'Stadium',    icon: '🏟', description: 'Arena echo, massive sound',
    reverb: { wet: 0.5,  decay: 4   }, delay: { wet: 0.4,  delayTime: 0.35, feedback: 0.6 },
    eq: { low: 3, mid: 0, high: 1 }, distortion: 0,
  },
  {
    label: 'Telephone',  icon: '📞', description: 'Classic phone distortion',
    reverb: { wet: 0,    decay: 0.5 }, delay: { wet: 0,    delayTime: 0.1,  feedback: 0   },
    eq: { low: -12, mid: 6, high: -12 }, distortion: 0.3,
  },
  {
    label: 'Radio',      icon: '📻', description: 'AM broadcast lo-fi',
    reverb: { wet: 0.05, decay: 0.5 }, delay: { wet: 0,    delayTime: 0.1,  feedback: 0   },
    eq: { low: -8, mid: 4, high: -6 }, distortion: 0.15,
  },
  {
    label: 'Lo-Fi',      icon: '📼', description: 'Cassette tape warmth',
    reverb: { wet: 0.15, decay: 1.0 }, delay: { wet: 0.1,  delayTime: 0.15, feedback: 0.2 },
    eq: { low: 3, mid: -2, high: -8 }, distortion: 0.1,
  },
  {
    label: 'Robot',      icon: '🤖', description: 'Vocoder-style effect',
    reverb: { wet: 0.1,  decay: 0.8 }, delay: { wet: 0.05, delayTime: 0.08, feedback: 0.1 },
    eq: { low: 0, mid: 8, high: 0 }, distortion: 0.5,
  },
];

export function LiveView() {
  const isMicActive        = useAudioStore(s => s.isMicActive);
  const setIsMicActive     = useAudioStore(s => s.setIsMicActive);
  const retuneSpeed        = useAudioStore(s => s.retuneSpeed);
  const setRetuneSpeed     = useAudioStore(s => s.setRetuneSpeed);
  const humanize           = useAudioStore(s => s.humanize);
  const setHumanize        = useAudioStore(s => s.setHumanize);
  const correctionAmount   = useAudioStore(s => s.correctionAmount);
  const setCorrectionAmount= useAudioStore(s => s.setCorrectionAmount);
  const correctionEnabled  = useAudioStore(s => s.correctionEnabled);
  const setCorrectionEnabled= useAudioStore(s => s.setCorrectionEnabled);
  const inputGain          = useAudioStore(s => s.inputGain);
  const setInputGain       = useAudioStore(s => s.setInputGain);
  const outputGain         = useAudioStore(s => s.outputGain);
  const setOutputGain      = useAudioStore(s => s.setOutputGain);
  const inputLevel         = useAudioStore(s => s.inputLevel);
  const updatePitch        = useAudioStore(s => s.updatePitch);

  const engineRef = useRef(getEngine());

  const [activePreset, setActivePreset]     = useState<string>('Off');
  const [activeFx, setActiveFx]             = useState<string>('Clean');
  const [harmoniesEnabled, setHarmonies]    = useState(false);
  const [harmonyNotes, setHarmonyNotes]     = useState<string[]>(['3rd', '5th']);

  const syncParams = useCallback(() => {
    const engine = engineRef.current;
    const state = useAudioStore.getState();
    engine.correctionParams = {
      key: state.key,
      scale: state.scale,
      retuneSpeed: state.retuneSpeed,
      humanize: state.humanize,
      amount: state.correctionAmount,
      enabled: state.correctionEnabled,
    };
    engine.setInputGain(state.inputGain);
    engine.setOutputGain(state.outputGain);
  }, []);

  const toggleMic = useCallback(async () => {
    const engine = engineRef.current;
    if (isMicActive) {
      engine.stopMic();
      setIsMicActive(false);
    } else {
      try {
        await engine.init();
        engine.onPitchData = (data) => updatePitch(data);
        syncParams();
        await engine.startMic();
        setIsMicActive(true);
        const monitorLevels = () => {
          if (useAudioStore.getState().isMicActive) {
            useAudioStore.getState().setInputLevel(engine.getInputLevel());
            requestAnimationFrame(monitorLevels);
          }
        };
        monitorLevels();
      } catch {
        alert('Failed to access microphone. Please check permissions.');
      }
    }
  }, [isMicActive, setIsMicActive, updatePitch, syncParams]);

  function applyTunePreset(preset: typeof TUNE_PRESETS[number]) {
    setActivePreset(preset.label);
    setRetuneSpeed(preset.retuneSpeed);
    setCorrectionAmount(preset.amount);
    setHumanize(preset.humanize);
    setCorrectionEnabled(preset.enabled);
    setTimeout(syncParams, 0);
  }

  function applyFxPreset(fx: VocalFx) {
    setActiveFx(fx.label);
    // Future: wire these values into the effects chain on the engine
    // For now, store them and show the selection
  }

  function toggleHarmonyNote(note: string) {
    setHarmonyNotes(prev =>
      prev.includes(note) ? prev.filter(n => n !== note) : [...prev, note]
    );
  }

  // Derive current preset label from knob values
  const presetLabel =
    !correctionEnabled ? 'Off'
    : retuneSpeed === 0 ? 'Robotic'
    : retuneSpeed <= 10 ? 'T-Pain'
    : retuneSpeed <= 100 ? 'Natural'
    : 'Subtle';

  return (
    <div className="live-view">

      {/* ── Row 1: Mic on/off + VU + status ── */}
      <div className="live-view__top">
        <button
          className={`live-view__mic-btn ${isMicActive ? 'live-view__mic-btn--on' : ''}`}
          onClick={toggleMic}
        >
          <span className="live-view__mic-icon">{isMicActive ? '🔴' : '🎤'}</span>
          {isMicActive ? 'Mic On — Click to Stop' : 'Start Mic'}
        </button>

        <div className="live-view__vu">
          <VuMeter level={inputLevel} height={40} />
        </div>

        <div className="live-view__status-pill">
          {isMicActive
            ? (correctionEnabled ? `Auto-Tune: ${presetLabel}` : 'Monitoring (no correction)')
            : 'Mic Off'}
        </div>
      </div>

      {/* ── Row 2: Note display + cents meter ── */}
      <div className="live-view__pitch-display panel">
        <NoteDisplay />
        <CentsMeter />
      </div>

      {/* ── Row 3: Auto-tune presets ── */}
      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">Auto-Tune Preset</span>
        </div>
        <div className="live-view__presets">
          {TUNE_PRESETS.map(p => (
            <button
              key={p.label}
              className={`btn btn--sm ${activePreset === p.label ? 'btn--active' : ''}`}
              onClick={() => applyTunePreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 justify-center" style={{ marginTop: 16 }}>
          <Knob label="Retune" value={retuneSpeed} min={0} max={400} step={1} unit="ms"
            onChange={v => { setRetuneSpeed(v); setActivePreset('Custom'); setTimeout(syncParams, 0); }} />
          <Knob label="Amount" value={correctionAmount} min={0} max={100} step={1} unit="%"
            color="var(--accent-green)"
            onChange={v => { setCorrectionAmount(v); setActivePreset('Custom'); setTimeout(syncParams, 0); }} />
          <Knob label="Humanize" value={humanize} min={0} max={100} step={1} unit="%"
            color="var(--accent-orange)"
            onChange={v => { setHumanize(v); setActivePreset('Custom'); setTimeout(syncParams, 0); }} />
        </div>

        <div style={{ marginTop: 12 }}>
          <KeySelector />
        </div>
      </div>

      {/* ── Row 4: Vocal FX rack ── */}
      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">Vocal FX</span>
          <span className="text-xs text-muted">One-tap voice effects</span>
        </div>
        <div className="live-view__fx-grid">
          {VOCAL_FX_PRESETS.map(fx => (
            <button
              key={fx.label}
              className={`live-view__fx-btn ${activeFx === fx.label ? 'live-view__fx-btn--active' : ''}`}
              onClick={() => applyFxPreset(fx)}
              title={fx.description}
            >
              <span className="live-view__fx-icon">{fx.icon}</span>
              <span className="live-view__fx-label">{fx.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Row 5: Harmonizer ── */}
      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">Harmonizer</span>
          <div
            className={`toggle ${harmoniesEnabled ? 'toggle--on' : ''}`}
            onClick={() => setHarmonies(!harmoniesEnabled)}
          >
            <div className="toggle__thumb" />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap" style={{ marginTop: 8 }}>
          {['3rd', '5th', 'Octave', '-3rd', '-5th'].map(note => (
            <button
              key={note}
              className={`btn btn--sm ${harmonyNotes.includes(note) ? 'btn--active' : ''}`}
              onClick={() => toggleHarmonyNote(note)}
              disabled={!harmoniesEnabled}
            >
              {note}
            </button>
          ))}
        </div>
        {harmoniesEnabled && (
          <p className="text-xs text-muted" style={{ marginTop: 8 }}>
            Harmonies: {harmonyNotes.join(', ')} above your pitch. Key-locked.
          </p>
        )}
      </div>

      {/* ── Row 6: Gain levels ── */}
      <div className="panel">
        <div className="panel__header">
          <span className="panel__title">Levels</span>
        </div>
        <div className="flex gap-4 justify-center items-center">
          <Knob label="Input" value={inputGain} min={0} max={2} step={0.01}
            onChange={v => { setInputGain(v); setTimeout(syncParams, 0); }} />
          <Knob label="Output" value={outputGain} min={0} max={2} step={0.01}
            onChange={v => { setOutputGain(v); setTimeout(syncParams, 0); }} />
        </div>
      </div>

    </div>
  );
}
