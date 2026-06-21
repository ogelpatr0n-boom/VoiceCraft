interface PlayheadProps {
  position: number; // in pixels
  height: number;
  visible: boolean;
}

export function Playhead({ position, height, visible }: PlayheadProps) {
  if (!visible || position < 0) return null;

  return (
    <div
      className="timeline-playhead"
      style={{
        left: position,
        height,
      }}
    >
      <div className="playhead-head" />
      <div className="playhead-line" />
    </div>
  );
}
