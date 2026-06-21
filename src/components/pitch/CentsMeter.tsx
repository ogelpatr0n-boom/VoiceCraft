import { useAudioStore } from '../../stores/audio-store';

export function CentsMeter() {
  const currentMidi = useAudioStore(s => s.currentMidi);
  const currentClarity = useAudioStore(s => s.currentClarity);

  const hasSignal = currentMidi > 0 && currentClarity > 0.5;
  const cents = hasSignal ? (currentMidi - Math.round(currentMidi)) * 100 : 0;
  const normalized = cents / 50; // -1 to 1

  const barWidth = Math.abs(normalized) * 50;
  const barLeft = normalized < 0 ? 50 - barWidth : 50;

  let barColor = 'var(--accent-green)';
  if (Math.abs(cents) > 25) barColor = 'var(--accent-red)';
  else if (Math.abs(cents) > 10) barColor = 'var(--accent-orange)';

  return (
    <div style={{ width: '100%', padding: '4px 0' }}>
      <div style={{
        height: 6,
        background: 'var(--bg-tertiary)',
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Center line */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 2,
          background: 'var(--text-muted)',
          transform: 'translateX(-50%)',
          zIndex: 1,
        }} />
        {/* Bar */}
        {hasSignal && (
          <div style={{
            position: 'absolute',
            left: `${barLeft}%`,
            top: 0,
            bottom: 0,
            width: `${barWidth}%`,
            background: barColor,
            borderRadius: 3,
            transition: 'all 0.05s',
          }} />
        )}
      </div>
      <div className="flex justify-between text-xs text-muted" style={{ marginTop: 2 }}>
        <span>-50c</span>
        <span>0</span>
        <span>+50c</span>
      </div>
    </div>
  );
}
