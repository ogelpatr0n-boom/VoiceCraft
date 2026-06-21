import { NOTE_NAMES, SCALES } from '../../audio/music-theory';
import { useAudioStore } from '../../stores/audio-store';
import type { NoteName } from '../../audio/music-theory';

export function KeySelector() {
  const key = useAudioStore(s => s.key);
  const scale = useAudioStore(s => s.scale);
  const setKey = useAudioStore(s => s.setKey);
  const setScale = useAudioStore(s => s.setScale);

  return (
    <div className="flex gap-2 items-center">
      <div className="flex flex-col gap-1">
        <label className="knob__label">Key</label>
        <select
          className="select"
          value={key}
          onChange={e => setKey(e.target.value as NoteName)}
        >
          {NOTE_NAMES.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="knob__label">Scale</label>
        <select
          className="select"
          value={scale}
          onChange={e => setScale(e.target.value)}
        >
          {Object.keys(SCALES).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
