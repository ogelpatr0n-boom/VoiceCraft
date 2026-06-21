import { useState, useEffect, useRef, useCallback } from 'react';
import { detectPitch, type PitchResult } from '../../audio/pitch-detector';

// Reference frequencies for common tunings
const TUNINGS: Record<string, { name: string; strings: { note: string; freq: number }[] }> = {
  'guitar-standard': {
    name: 'Guitar — Standard (EADGBe)',
    strings: [
      { note: 'E2', freq: 82.41 },
      { note: 'A2', freq: 110.00 },
      { note: 'D3', freq: 146.83 },
      { note: 'G3', freq: 196.00 },
      { note: 'B3', freq: 246.94 },
      { note: 'e4', freq: 329.63 },
    ],
  },
  'guitar-drop-d': {
    name: 'Guitar — Drop D (DADGBe)',
    strings: [
      { note: 'D2', freq: 73.42 },
      { note: 'A2', freq: 110.00 },
      { note: 'D3', freq: 146.83 },
      { note: 'G3', freq: 196.00 },
      { note: 'B3', freq: 246.94 },
      { note: 'e4', freq: 329.63 },
    ],
  },
  'guitar-open-g': {
    name: 'Guitar — Open G (DGDGBd)',
    strings: [
      { note: 'D2', freq: 73.42 },
      { note: 'G2', freq: 98.00 },
      { note: 'D3', freq: 146.83 },
      { note: 'G3', freq: 196.00 },
      { note: 'B3', freq: 246.94 },
      { note: 'd4', freq: 293.66 },
    ],
  },
  'bass-4': {
    name: 'Bass — Standard (EADg)',
    strings: [
      { note: 'E1', freq: 41.20 },
      { note: 'A1', freq: 55.00 },
      { note: 'D2', freq: 73.42 },
      { note: 'G2', freq: 98.00 },
    ],
  },
  'bass-5': {
    name: 'Bass — 5-String (BEADg)',
    strings: [
      { note: 'B0', freq: 30.87 },
      { note: 'E1', freq: 41.20 },
      { note: 'A1', freq: 55.00 },
      { note: 'D2', freq: 73.42 },
      { note: 'G2', freq: 98.00 },
    ],
  },
  'ukulele': {
    name: 'Ukulele — Standard (GCEa)',
    strings: [
      { note: 'G4', freq: 392.00 },
      { note: 'C4', freq: 261.63 },
      { note: 'E4', freq: 329.63 },
      { note: 'A4', freq: 440.00 },
    ],
  },
  'violin': {
    name: 'Violin — Standard (GDAe)',
    strings: [
      { note: 'G3', freq: 196.00 },
      { note: 'D4', freq: 293.66 },
      { note: 'A4', freq: 440.00 },
      { note: 'e5', freq: 659.25 },
    ],
  },
  'chromatic': {
    name: 'Chromatic',
    strings: [],
  },
};

const NEEDLE_RANGE = 50; // cents

function NeedleMeter({ cents, inTune }: { cents: number; inTune: boolean }) {
  const clamped = Math.max(-NEEDLE_RANGE, Math.min(NEEDLE_RANGE, cents));
  const pct = ((clamped + NEEDLE_RANGE) / (2 * NEEDLE_RANGE)) * 100;

  return (
    <div className="tuner__meter">
      <div className="tuner__meter-track">
        <div className="tuner__meter-center" />
        <div
          className={`tuner__meter-needle ${inTune ? 'tuner__meter-needle--in-tune' : ''}`}
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="tuner__meter-labels">
        <span>−50¢</span>
        <span>0¢</span>
        <span>+50¢</span>
      </div>
    </div>
  );
}

function StringGrid({ strings, detectedMidi }: {
  strings: { note: string; freq: number }[];
  detectedMidi: number | null;
}) {
  if (strings.length === 0) return null;

  return (
    <div className="tuner__strings">
      <div className="tuner__strings-label">String reference</div>
      <div className="tuner__strings-grid">
        {strings.map((s, i) => {
          const stringMidi = Math.round(12 * Math.log2(s.freq / 440) + 69);
          const active = detectedMidi !== null && Math.abs(detectedMidi - stringMidi) <= 1;
          return (
            <div key={i} className={`tuner__string ${active ? 'tuner__string--active' : ''}`}>
              <span className="tuner__string-num">{i + 1}</span>
              <span className="tuner__string-note">{s.note}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TunerView() {
  const [isListening, setIsListening] = useState(false);
  const [tuning, setTuning] = useState('guitar-standard');
  const [pitch, setPitch] = useState<PitchResult>({ frequency: null, note: null, midi: null, cents: 0, clarity: 0 });
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    const result = detectPitch(buf, analyser.context.sampleRate);
    setPitch(result);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);

      streamRef.current = stream;
      contextRef.current = ctx;
      analyserRef.current = analyser;
      setIsListening(true);
      setError(null);
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setError('Microphone access denied. Please allow microphone permission.');
    }
  }, [tick]);

  const stopListening = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    contextRef.current?.close();
    streamRef.current = null;
    contextRef.current = null;
    analyserRef.current = null;
    setIsListening(false);
    setPitch({ frequency: null, note: null, midi: null, cents: 0, clarity: 0 });
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  const inTune = pitch.frequency !== null && Math.abs(pitch.cents) <= 5 && pitch.clarity > 0.4;
  const hasSignal = pitch.frequency !== null && pitch.clarity > 0.3;
  const currentTuning = TUNINGS[tuning];

  return (
    <div className="tuner">
      {/* Header */}
      <div className="tuner__header">
        <h2 className="tuner__title">Instrument Tuner</h2>
        <select
          className="tuner__tuning-select"
          value={tuning}
          onChange={e => setTuning(e.target.value)}
        >
          {Object.entries(TUNINGS).map(([key, t]) => (
            <option key={key} value={key}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Main display */}
      <div className={`tuner__display ${inTune ? 'tuner__display--in-tune' : ''} ${!hasSignal && isListening ? 'tuner__display--waiting' : ''}`}>
        {!isListening ? (
          <div className="tuner__idle">
            <div className="tuner__idle-icon">🎸</div>
            <div className="tuner__idle-text">Press Start to begin tuning</div>
          </div>
        ) : !hasSignal ? (
          <div className="tuner__waiting">
            <div className="tuner__waiting-icon">🎤</div>
            <div className="tuner__waiting-text">Listening... Play a note</div>
          </div>
        ) : (
          <>
            <div className={`tuner__note-display ${inTune ? 'tuner__note-display--in-tune' : ''}`}>
              {pitch.note}
            </div>
            <div className="tuner__freq">
              {pitch.frequency?.toFixed(1)} Hz
            </div>
            <NeedleMeter cents={pitch.cents} inTune={inTune} />
            <div className={`tuner__status ${inTune ? 'tuner__status--in-tune' : pitch.cents < 0 ? 'tuner__status--flat' : 'tuner__status--sharp'}`}>
              {inTune ? '✓ In Tune' : pitch.cents < 0 ? `${Math.abs(pitch.cents)}¢ Flat` : `${pitch.cents}¢ Sharp`}
            </div>
          </>
        )}
      </div>

      {/* Start/Stop */}
      <div className="tuner__controls">
        <button
          className={`tuner__btn ${isListening ? 'tuner__btn--stop' : 'tuner__btn--start'}`}
          onClick={isListening ? stopListening : startListening}
        >
          {isListening ? '■ Stop' : '▶ Start Tuning'}
        </button>
      </div>

      {/* String reference grid */}
      {currentTuning.strings.length > 0 && (
        <StringGrid strings={currentTuning.strings} detectedMidi={pitch.midi} />
      )}

      {/* Chromatic mode: just show note names near detected pitch */}
      {tuning === 'chromatic' && hasSignal && (
        <div className="tuner__chromatic-hint">
          <div className="tuner__chromatic-notes">
            {[pitch.midi! - 1, pitch.midi!, pitch.midi! + 1].map(m => {
              const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
              return (
                <span key={m} className={`tuner__chromatic-note ${m === pitch.midi ? 'tuner__chromatic-note--current' : ''}`}>
                  {names[m % 12]}{Math.floor(m / 12) - 1}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {error && <div className="tuner__error">{error}</div>}

      {/* Tips */}
      <div className="tuner__tips">
        <div className="tuner__tip">Hold your phone/device close to the instrument soundhole or bridge.</div>
        <div className="tuner__tip">Tune in a quiet room — background noise can confuse pitch detection.</div>
        <div className="tuner__tip">Green = in tune (within ±5¢). Needle left = flat, right = sharp.</div>
      </div>
    </div>
  );
}
