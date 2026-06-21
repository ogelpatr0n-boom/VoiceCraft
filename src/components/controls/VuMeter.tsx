interface VuMeterProps {
  level: number;
  height?: number;
}

export function VuMeter({ level, height = 100 }: VuMeterProps) {
  const clampedLevel = Math.max(0, Math.min(1, level));
  const dbLevel = clampedLevel > 0 ? 20 * Math.log10(clampedLevel) : -60;
  const displayHeight = Math.max(0, (dbLevel + 60) / 60 * 100);

  return (
    <div className="vu-meter" style={{ height }}>
      <div className="vu-meter__fill" style={{ height: `${displayHeight}%` }} />
    </div>
  );
}
