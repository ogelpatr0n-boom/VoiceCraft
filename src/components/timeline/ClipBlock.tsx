import { useState, useCallback, useRef, useEffect } from 'react';
import { useTimelineStore, type TimelineClip } from '../../stores/timeline-store';
import type { MidiNote } from '../../audio/midi/midi-event';

interface ClipBlockProps {
  clip: TimelineClip;
  pixelsPerBeat: number;
  trackHeight: number;
  isSelected: boolean;
  onSelect: (addToSelection: boolean) => void;
  onDoubleClick: () => void;
}

type DragMode = 'move' | 'trim-left' | 'trim-right' | 'fade-in' | 'fade-out' | null;

export function ClipBlock({
  clip,
  pixelsPerBeat,
  trackHeight,
  isSelected,
  onSelect,
  onDoubleClick,
}: ClipBlockProps) {
  const { updateClip, splitClip, duplicateClip, removeClip } = useTimelineStore();

  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [originalValues, setOriginalValues] = useState({ start: 0, duration: 0, trimStart: 0, trimEnd: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  const width = clip.duration * pixelsPerBeat;
  const left = clip.startBeat * pixelsPerBeat;

  // Fade widths in pixels (convert from seconds to beats to pixels if needed)
  const fadeInWidth = (clip.trimStart || 0) * pixelsPerBeat * 4; // Approximate
  const fadeOutWidth = (clip.trimEnd || 0) * pixelsPerBeat * 4;

  const handleMouseDown = useCallback((e: React.MouseEvent, mode: DragMode) => {
    e.stopPropagation();
    e.preventDefault();

    setDragMode(mode);
    setDragStartX(e.clientX);
    setOriginalValues({
      start: clip.startBeat,
      duration: clip.duration,
      trimStart: clip.trimStart || 0,
      trimEnd: clip.trimEnd || 0,
    });
  }, [clip]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragMode) return;

    const deltaX = e.clientX - dragStartX;
    const deltaBeats = deltaX / pixelsPerBeat;

    switch (dragMode) {
      case 'move':
        updateClip(clip.id, {
          startBeat: Math.max(0, originalValues.start + deltaBeats),
        });
        break;

      case 'trim-left': {
        const newStart = Math.max(0, originalValues.start + deltaBeats);
        const startDelta = newStart - originalValues.start;
        const newDuration = Math.max(0.25, originalValues.duration - startDelta);
        updateClip(clip.id, {
          startBeat: newStart,
          duration: newDuration,
          trimStart: Math.max(0, (originalValues.trimStart || 0) + startDelta / 4),
        });
        break;
      }

      case 'trim-right': {
        const newDuration = Math.max(0.25, originalValues.duration + deltaBeats);
        updateClip(clip.id, {
          duration: newDuration,
        });
        break;
      }

      case 'fade-in': {
        const fadeBeats = Math.max(0, Math.min(clip.duration / 2, deltaBeats));
        updateClip(clip.id, {
          trimStart: fadeBeats / 4,
        });
        break;
      }

      case 'fade-out': {
        const fadeBeats = Math.max(0, Math.min(clip.duration / 2, -deltaBeats));
        updateClip(clip.id, {
          trimEnd: fadeBeats / 4,
        });
        break;
      }
    }
  }, [dragMode, dragStartX, pixelsPerBeat, clip.id, clip.duration, originalValues, updateClip]);

  const handleMouseUp = useCallback(() => {
    setDragMode(null);
  }, []);

  useEffect(() => {
    if (dragMode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragMode, handleMouseMove, handleMouseUp]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  const handleSplit = useCallback(() => {
    // Split at the middle of the clip
    const splitPoint = clip.startBeat + clip.duration / 2;
    splitClip(clip.id, splitPoint);
    setShowContextMenu(false);
  }, [clip, splitClip]);

  const handleDuplicate = useCallback(() => {
    duplicateClip(clip.id);
    setShowContextMenu(false);
  }, [clip.id, duplicateClip]);

  const handleDelete = useCallback(() => {
    removeClip(clip.id);
    setShowContextMenu(false);
  }, [clip.id, removeClip]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(e.shiftKey);
  };

  const handleDoubleClickEvent = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick();
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`clip-editor ${isSelected ? 'selected' : ''} ${clip.type}`}
        style={{
          left,
          width: width - 2,
          height: trackHeight - 4,
          backgroundColor: clip.color,
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClickEvent}
        onContextMenu={handleContextMenu}
        onMouseDown={(e) => {
          if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('clip-body')) {
            handleMouseDown(e, 'move');
          }
        }}
      >
        {/* Clip header */}
        <div className="clip-header">
          <span className="clip-name">{clip.name}</span>
        </div>

        {/* Clip body */}
        <div className="clip-body">
          {/* Fade in visualization */}
          {fadeInWidth > 0 && (
            <svg className="fade-overlay fade-in" style={{ width: fadeInWidth }}>
              <polygon
                points={`0,0 ${fadeInWidth},0 ${fadeInWidth},${trackHeight - 24} 0,${trackHeight - 24}`}
                fill="rgba(0,0,0,0.3)"
              />
              <line
                x1="0" y1={trackHeight - 24}
                x2={fadeInWidth} y2="0"
                stroke="white" strokeWidth="2"
              />
            </svg>
          )}

          {/* Fade out visualization */}
          {fadeOutWidth > 0 && (
            <svg
              className="fade-overlay fade-out"
              style={{ width: fadeOutWidth, right: 0, left: 'auto' }}
            >
              <polygon
                points={`0,0 ${fadeOutWidth},0 ${fadeOutWidth},${trackHeight - 24} 0,${trackHeight - 24}`}
                fill="rgba(0,0,0,0.3)"
              />
              <line
                x1="0" y1="0"
                x2={fadeOutWidth} y2={trackHeight - 24}
                stroke="white" strokeWidth="2"
              />
            </svg>
          )}

          {/* Waveform/MIDI preview */}
          {clip.type === 'audio' && (
            <WaveformPreview width={width - 4} height={trackHeight - 24} />
          )}
          {clip.type === 'midi' && clip.notes && (
            <MidiPreview
              notes={clip.notes}
              duration={clip.duration}
              width={width - 4}
              height={trackHeight - 24}
            />
          )}
        </div>

        {/* Trim handles */}
        <div
          className="trim-handle left"
          onMouseDown={(e) => handleMouseDown(e, 'trim-left')}
        />
        <div
          className="trim-handle right"
          onMouseDown={(e) => handleMouseDown(e, 'trim-right')}
        />

        {/* Fade handles (shown when selected) */}
        {isSelected && (
          <>
            <div
              className="fade-handle fade-in-handle"
              style={{ left: Math.max(0, fadeInWidth - 6) }}
              onMouseDown={(e) => handleMouseDown(e, 'fade-in')}
            />
            <div
              className="fade-handle fade-out-handle"
              style={{ right: Math.max(0, fadeOutWidth - 6) }}
              onMouseDown={(e) => handleMouseDown(e, 'fade-out')}
            />
          </>
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="clip-context-menu"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={handleSplit}>Split at Center</button>
          <button onClick={handleDuplicate}>Duplicate</button>
          <div className="context-menu-divider" />
          <button onClick={() => { updateClip(clip.id, { trimStart: 0.1 }); setShowContextMenu(false); }}>Add Fade In</button>
          <button onClick={() => { updateClip(clip.id, { trimEnd: 0.1 }); setShowContextMenu(false); }}>Add Fade Out</button>
          <button onClick={() => { updateClip(clip.id, { trimStart: 0, trimEnd: 0 }); setShowContextMenu(false); }}>Remove Fades</button>
          <div className="context-menu-divider" />
          <button className="danger" onClick={handleDelete}>Delete</button>
        </div>
      )}
    </>
  );
}

// MIDI preview component
function MidiPreview({
  notes,
  duration,
  width,
  height,
}: {
  notes: MidiNote[];
  duration: number;
  width: number;
  height: number;
}) {
  if (notes.length === 0) return null;

  const pitches = notes.map((n) => n.pitch);
  const minPitch = Math.min(...pitches);
  const maxPitch = Math.max(...pitches);
  const pitchRange = Math.max(12, maxPitch - minPitch + 1);

  return (
    <svg className="midi-preview" width={width} height={height}>
      {notes.map((note) => {
        const x = (note.start / duration) * width;
        const w = Math.max(1, (note.duration / duration) * width);
        const y = height - ((note.pitch - minPitch + 1) / pitchRange) * height;
        const h = Math.max(1, height / pitchRange);

        return (
          <rect
            key={note.id}
            x={x}
            y={y}
            width={w}
            height={h}
            fill="currentColor"
            opacity={0.7}
          />
        );
      })}
    </svg>
  );
}

// Waveform preview component
function WaveformPreview({ width, height }: { width: number; height: number }) {
  const points: string[] = [];
  const midY = height / 2;

  for (let x = 0; x < width; x += 2) {
    const amplitude = Math.random() * 0.8 + 0.1;
    const y1 = midY - amplitude * midY;
    const y2 = midY + amplitude * midY;
    points.push(`M${x} ${y1} L${x} ${y2}`);
  }

  return (
    <svg className="waveform-preview" width={width} height={height}>
      <path d={points.join(' ')} stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
    </svg>
  );
}
