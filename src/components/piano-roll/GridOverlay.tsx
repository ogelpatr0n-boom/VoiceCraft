import { useMemo } from 'react';

interface GridOverlayProps {
  width: number;
  height: number;
  lowNote: number;
  highNote: number;
  noteHeight: number;
  pixelsPerBeat: number;
  beatsPerBar: number;
  totalBeats: number;
  scrollX: number;
}

const BLACK_NOTES = [1, 3, 6, 8, 10];

export function GridOverlay({
  width,
  height,
  lowNote,
  highNote,
  noteHeight,
  pixelsPerBeat,
  beatsPerBar,
  totalBeats,
  scrollX,
}: GridOverlayProps) {
  const horizontalLines = useMemo(() => {
    const lines = [];
    for (let note = highNote; note >= lowNote; note--) {
      const y = (highNote - note) * noteHeight;
      const isBlack = BLACK_NOTES.includes(note % 12);
      const isC = note % 12 === 0;
      lines.push({ y, isBlack, isC, note });
    }
    return lines;
  }, [lowNote, highNote, noteHeight]);

  const verticalLines = useMemo(() => {
    const lines = [];
    const startBeat = Math.floor(scrollX / pixelsPerBeat);
    const endBeat = Math.ceil((scrollX + width) / pixelsPerBeat);

    for (let beat = startBeat; beat <= endBeat && beat <= totalBeats; beat++) {
      const x = beat * pixelsPerBeat - scrollX;
      const isBar = beat % beatsPerBar === 0;
      const isHalfBeat = beat % 0.5 === 0 && beat % 1 !== 0;
      lines.push({ x, beat, isBar, isHalfBeat });
    }

    // Add subdivision lines (16th notes)
    const subdivisions = [];
    for (let beat = startBeat; beat <= endBeat && beat <= totalBeats; beat += 0.25) {
      if (beat % 0.5 === 0) continue; // Skip beats and half-beats
      const x = beat * pixelsPerBeat - scrollX;
      subdivisions.push({ x, beat });
    }

    return { main: lines, subdivisions };
  }, [scrollX, width, pixelsPerBeat, beatsPerBar, totalBeats]);

  return (
    <svg className="grid-overlay" width={width} height={height}>
      <defs>
        <pattern id="rowPattern" width={width} height={noteHeight} patternUnits="userSpaceOnUse">
          <rect width={width} height={noteHeight} fill="transparent" />
        </pattern>
      </defs>

      {/* Row backgrounds */}
      {horizontalLines.map(({ y, isBlack, isC }) => (
        <rect
          key={y}
          x={0}
          y={y}
          width={width}
          height={noteHeight}
          className={`grid-row ${isBlack ? 'black-key' : 'white-key'} ${isC ? 'is-c' : ''}`}
        />
      ))}

      {/* Horizontal lines (note boundaries) */}
      {horizontalLines.map(({ y, isC }) => (
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          className={`grid-line horizontal ${isC ? 'octave' : ''}`}
        />
      ))}

      {/* 16th note subdivisions */}
      {verticalLines.subdivisions.map(({ x, beat }) => (
        <line
          key={`sub-${beat}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          className="grid-line subdivision"
        />
      ))}

      {/* Vertical lines (beat/bar boundaries) */}
      {verticalLines.main.map(({ x, beat, isBar }) => (
        <line
          key={`v-${beat}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          className={`grid-line vertical ${isBar ? 'bar' : 'beat'}`}
        />
      ))}
    </svg>
  );
}
