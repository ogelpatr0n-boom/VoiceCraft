import { useRef, useState, useCallback, useEffect } from 'react';
import type { TimelineTrack, TimelineClip } from '../../stores/timeline-store';
import { ClipBlock } from './ClipBlock';
import { Playhead } from './Playhead';
import { LoopRegion } from './LoopRegion';

interface TimelineCanvasProps {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  pixelsPerBeat: number;
  scrollX: number;
  scrollY: number;
  totalBeats: number;
  beatsPerBar: number;
  currentBeat: number;
  loopStart: number;
  loopEnd: number;
  loopEnabled: boolean;
  selectedClipIds: Set<string>;
  onClipSelect: (clipId: string, addToSelection: boolean) => void;
  onClipDoubleClick: (clipId: string) => void;
  onClipMove: (clipId: string, trackId: string, startBeat: number) => void;
  onScrollChange: (x: number, y: number) => void;
  onLoopChange: (start: number, end: number) => void;
  onPositionChange: (beat: number) => void;
}

export function TimelineCanvas({
  tracks,
  clips,
  pixelsPerBeat,
  scrollX,
  scrollY,
  totalBeats,
  beatsPerBar,
  currentBeat,
  loopStart,
  loopEnd,
  loopEnabled,
  selectedClipIds,
  onClipSelect,
  onClipDoubleClick,
  onClipMove,
  onScrollChange,
  onLoopChange,
  onPositionChange,
}: TimelineCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [dragState, setDragState] = useState<{
    clipId: string;
    startX: number;
    startY: number;
    originalBeat: number;
    originalTrackId: string;
  } | null>(null);

  // Track total height
  const totalHeight = tracks.reduce((sum, t) => sum + t.height, 0);
  const contentWidth = totalBeats * pixelsPerBeat;

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Get track Y position
  const getTrackY = useCallback((trackId: string): number => {
    let y = 0;
    for (const track of tracks) {
      if (track.id === trackId) return y;
      y += track.height;
    }
    return y;
  }, [tracks]);

  // Find track at Y position
  const getTrackAtY = useCallback((y: number): TimelineTrack | undefined => {
    let currentY = 0;
    for (const track of tracks) {
      if (y >= currentY && y < currentY + track.height) {
        return track;
      }
      currentY += track.height;
    }
    return undefined;
  }, [tracks]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + scrollY;

    // Check if clicking on empty area (set playhead)
    const beat = (x + scrollX) / pixelsPerBeat;
    onPositionChange(Math.max(0, beat));
  }, [scrollX, scrollY, pixelsPerBeat, onPositionChange]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const deltaX = e.shiftKey ? e.deltaY : e.deltaX;
    const deltaY = e.shiftKey ? 0 : e.deltaY;

    onScrollChange(
      Math.max(0, Math.min(contentWidth - dimensions.width, scrollX + deltaX)),
      Math.max(0, Math.min(totalHeight - dimensions.height, scrollY + deltaY))
    );
  }, [scrollX, scrollY, contentWidth, totalHeight, dimensions, onScrollChange]);

  // Draw grid lines
  const gridLines = [];
  const startBeat = Math.floor(scrollX / pixelsPerBeat);
  const endBeat = Math.ceil((scrollX + dimensions.width) / pixelsPerBeat);

  for (let beat = startBeat; beat <= endBeat && beat <= totalBeats; beat++) {
    const x = beat * pixelsPerBeat - scrollX;
    const isBar = beat % beatsPerBar === 0;
    gridLines.push(
      <line
        key={beat}
        x1={x}
        y1={0}
        x2={x}
        y2={dimensions.height}
        className={`grid-line ${isBar ? 'bar' : 'beat'}`}
      />
    );
  }

  // Track backgrounds
  const trackBgs = [];
  let trackY = -scrollY;
  for (const track of tracks) {
    trackBgs.push(
      <div
        key={track.id}
        className={`track-row ${track.muted ? 'muted' : ''}`}
        style={{
          top: trackY,
          height: track.height,
        }}
      />
    );
    trackY += track.height;
  }

  const playheadX = currentBeat * pixelsPerBeat - scrollX;
  const loopStartX = loopStart * pixelsPerBeat - scrollX;
  const loopEndX = loopEnd * pixelsPerBeat - scrollX;

  return (
    <div
      ref={containerRef}
      className="timeline-canvas"
      onPointerDown={handlePointerDown}
      onWheel={handleWheel}
    >
      {/* Track backgrounds */}
      <div className="track-backgrounds">
        {trackBgs}
      </div>

      {/* Grid */}
      <svg className="timeline-grid" width={dimensions.width} height={dimensions.height}>
        {gridLines}
      </svg>

      {/* Loop region */}
      <LoopRegion
        startX={loopStartX}
        endX={loopEndX}
        height={dimensions.height}
        enabled={loopEnabled}
        onLoopChange={onLoopChange}
        pixelsPerBeat={pixelsPerBeat}
        scrollX={scrollX}
      />

      {/* Clips */}
      <div
        className="clips-container"
        style={{ transform: `translate(${-scrollX}px, ${-scrollY}px)` }}
      >
        {clips.map((clip) => {
          const track = tracks.find((t) => t.id === clip.trackId);
          if (!track) return null;

          const y = getTrackY(clip.trackId);

          return (
            <div
              key={clip.id}
              style={{
                position: 'absolute',
                top: y,
                left: 0,
              }}
            >
              <ClipBlock
                clip={clip}
                pixelsPerBeat={pixelsPerBeat}
                trackHeight={track.height}
                isSelected={selectedClipIds.has(clip.id)}
                onSelect={(add) => onClipSelect(clip.id, add)}
                onDoubleClick={() => onClipDoubleClick(clip.id)}
              />
            </div>
          );
        })}
      </div>

      {/* Playhead */}
      <Playhead
        position={playheadX}
        height={dimensions.height}
        visible={playheadX >= 0 && playheadX <= dimensions.width}
      />
    </div>
  );
}
