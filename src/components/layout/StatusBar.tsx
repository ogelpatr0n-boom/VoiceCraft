import { useAudioStore } from '../../stores/audio-store';

export function StatusBar() {
  const isMicActive = useAudioStore(s => s.isMicActive);
  const currentFrequency = useAudioStore(s => s.currentFrequency);
  const currentClarity = useAudioStore(s => s.currentClarity);
  const key = useAudioStore(s => s.key);
  const scale = useAudioStore(s => s.scale);

  return (
    <div className="status-bar">
      <span className={`status-bar__dot ${isMicActive ? 'status-bar__dot--active' : ''}`} />
      <span>{isMicActive ? 'Mic Active' : 'Mic Off'}</span>
      <span>|</span>
      <span>Key: {key} {scale}</span>
      <span>|</span>
      <span>Freq: {currentFrequency > 0 ? `${currentFrequency.toFixed(1)} Hz` : '--'}</span>
      <span>|</span>
      <span>Clarity: {(currentClarity * 100).toFixed(0)}%</span>
      <div style={{ flex: 1 }} />
      <span>44100 Hz / 32-bit</span>
    </div>
  );
}
