import { useState, useCallback, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { useTimelineStore } from '../../stores/timeline-store';
import { useInstrumentStore } from '../../stores/instrument-store';
import { useProjectStore } from '../../stores/project-store';
import { PianoRollCanvas } from '../piano-roll/PianoRollCanvas';
import { PianoKeysColumn } from '../piano-roll/PianoKeysColumn';
import { VelocityLane } from '../piano-roll/VelocityLane';
import type { PianoRollTool } from '../piano-roll/NoteTools';
import { NoteTools } from '../piano-roll/NoteTools';
import type { MidiNote } from '../../audio/midi/midi-event';
import { createSynth } from '../../audio/instruments/synth';

const LOW_NOTE = 24;  // C1
const HIGH_NOTE = 96; // C7
const NOTE_HEIGHT = 16;
const DEFAULT_PIXELS_PER_BEAT = 60;

export function PianoRollView() {
  const clips = useTimelineStore((s) => s.clips);
  const updateClip = useTimelineStore((s) => s.updateClip);
  const instruments = useInstrumentStore((s) => s.instruments);
  const bpm = useProjectStore((s) => s.bpm);

  // State
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<PianoRollTool>('draw');
  const [gridDivision, setGridDivision] = useState(4); // 1/4 notes
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [pixelsPerBeat, setPixelsPerBeat] = useState(DEFAULT_PIXELS_PER_BEAT);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState((HIGH_NOTE - 60) * NOTE_HEIGHT); // Center on middle C

  // Preview synth for note audition
  const previewSynthRef = useRef<ReturnType<typeof createSynth> | null>(null);

  useEffect(() => {
    previewSynthRef.current = createSynth('Preview');
    previewSynthRef.current.connect(Tone.getDestination());
    previewSynthRef.current.setVolume(-6);

    return () => {
      previewSynthRef.current?.dispose();
    };
  }, []);

  // Get MIDI clips only
  const midiClips = clips.filter((c) => c.type === 'midi');
  const selectedClip = midiClips.find((c) => c.id === selectedClipId);

  // Auto-select first clip if none selected
  useEffect(() => {
    if (!selectedClipId && midiClips.length > 0) {
      setSelectedClipId(midiClips[0].id);
    }
  }, [midiClips, selectedClipId]);

  const handleNoteAdd = useCallback((note: MidiNote) => {
    if (!selectedClip) return;

    const updatedNotes = [...(selectedClip.notes || []), note];
    updateClip(selectedClip.id, { notes: updatedNotes });
  }, [selectedClip, updateClip]);

  const handleNoteRemove = useCallback((noteId: string) => {
    if (!selectedClip) return;

    const updatedNotes = (selectedClip.notes || []).filter((n) => n.id !== noteId);
    updateClip(selectedClip.id, { notes: updatedNotes });
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      next.delete(noteId);
      return next;
    });
  }, [selectedClip, updateClip]);

  const handleNoteUpdate = useCallback((noteId: string, updates: Partial<MidiNote>) => {
    if (!selectedClip) return;

    const updatedNotes = (selectedClip.notes || []).map((n) =>
      n.id === noteId ? { ...n, ...updates } : n
    );
    updateClip(selectedClip.id, { notes: updatedNotes });
  }, [selectedClip, updateClip]);

  const handleNoteSelect = useCallback((noteId: string, addToSelection: boolean) => {
    setSelectedNoteIds((prev) => {
      if (addToSelection) {
        const next = new Set(prev);
        if (next.has(noteId)) {
          next.delete(noteId);
        } else {
          next.add(noteId);
        }
        return next;
      }
      return new Set([noteId]);
    });
  }, []);

  const handleSelectionClear = useCallback(() => {
    setSelectedNoteIds(new Set());
  }, []);

  const handleSelectionBoxComplete = useCallback((noteIds: string[], addToSelection: boolean) => {
    setSelectedNoteIds(prev => {
      const next = addToSelection ? new Set(prev) : new Set<string>();
      for (const id of noteIds) next.add(id);
      return next;
    });
  }, []);

  const handleScrollChange = useCallback((x: number, y: number) => {
    setScrollX(x);
    setScrollY(y);
  }, []);

  const handlePreviewNote = useCallback((pitch: number) => {
    Tone.start();
    previewSynthRef.current?.triggerAttack(pitch, undefined, 80);
  }, []);

  const handleStopPreview = useCallback((pitch: number) => {
    previewSynthRef.current?.triggerRelease(pitch);
  }, []);

  const handleVelocityChange = useCallback((noteId: string, velocity: number) => {
    handleNoteUpdate(noteId, { velocity });
  }, [handleNoteUpdate]);

  const handleZoom = useCallback((delta: number) => {
    setPixelsPerBeat((prev) => Math.max(20, Math.min(200, prev + delta)));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key.toLowerCase()) {
        case 'v':
          setTool('select');
          break;
        case 'd':
          setTool('draw');
          break;
        case 'e':
          setTool('erase');
          break;
        case 'delete':
        case 'backspace':
          if (selectedNoteIds.size > 0 && selectedClip) {
            const updatedNotes = (selectedClip.notes || []).filter(
              (n) => !selectedNoteIds.has(n.id)
            );
            updateClip(selectedClip.id, { notes: updatedNotes });
            setSelectedNoteIds(new Set());
          }
          break;
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (selectedClip?.notes) {
              setSelectedNoteIds(new Set(selectedClip.notes.map((n) => n.id)));
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteIds, selectedClip, updateClip]);

  const clipColor = selectedClip?.color || '#00d4ff';
  const totalBeats = selectedClip?.duration || 16;

  return (
    <div className="piano-roll-view">
      <div className="piano-roll-toolbar">
        <div className="clip-selector">
          <label>Clip:</label>
          <select
            value={selectedClipId || ''}
            onChange={(e) => setSelectedClipId(e.target.value || null)}
          >
            <option value="">-- Select Clip --</option>
            {midiClips.map((clip) => (
              <option key={clip.id} value={clip.id}>
                {clip.name}
              </option>
            ))}
          </select>
        </div>

        <NoteTools
          activeTool={tool}
          onToolChange={setTool}
          gridDivision={gridDivision}
          onGridDivisionChange={setGridDivision}
          snapEnabled={snapEnabled}
          onSnapToggle={() => setSnapEnabled((v) => !v)}
        />

        <div className="zoom-controls">
          <button onClick={() => handleZoom(-10)}>-</button>
          <span>{Math.round(pixelsPerBeat)}px/beat</span>
          <button onClick={() => handleZoom(10)}>+</button>
        </div>
      </div>

      {!selectedClip ? (
        <div className="piano-roll-empty">
          <p>No MIDI clip selected.</p>
          <p className="text-muted text-sm">
            Create a MIDI track in the Arrangement view, then add a clip to edit notes.
          </p>
        </div>
      ) : (
        <div className="piano-roll-content">
          <div className="piano-roll-header">
            <div className="piano-keys-spacer" />
            <div className="piano-roll-ruler">
              {Array.from({ length: Math.ceil(totalBeats / 4) + 1 }, (_, i) => (
                <div
                  key={i}
                  className="ruler-bar"
                  style={{ left: i * 4 * pixelsPerBeat - scrollX }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="piano-roll-body">
            <PianoKeysColumn
              lowNote={LOW_NOTE}
              highNote={HIGH_NOTE}
              noteHeight={NOTE_HEIGHT}
              onNoteClick={handlePreviewNote}
            />

            <PianoRollCanvas
              notes={selectedClip.notes || []}
              selectedNoteIds={selectedNoteIds}
              lowNote={LOW_NOTE}
              highNote={HIGH_NOTE}
              noteHeight={NOTE_HEIGHT}
              pixelsPerBeat={pixelsPerBeat}
              totalBeats={totalBeats}
              beatsPerBar={4}
              scrollX={scrollX}
              scrollY={scrollY}
              gridDivision={gridDivision}
              snapEnabled={snapEnabled}
              tool={tool}
              clipColor={clipColor}
              onNoteAdd={handleNoteAdd}
              onNoteRemove={handleNoteRemove}
              onNoteUpdate={handleNoteUpdate}
              onNoteSelect={handleNoteSelect}
              onSelectionClear={handleSelectionClear}
              onSelectionBoxComplete={handleSelectionBoxComplete}
              onScrollChange={handleScrollChange}
              onPreviewNote={handlePreviewNote}
              onStopPreview={handleStopPreview}
            />
          </div>

          <div className="piano-roll-footer">
            <div className="velocity-label">Velocity</div>
            <VelocityLane
              notes={selectedClip.notes || []}
              selectedNoteIds={selectedNoteIds}
              pixelsPerBeat={pixelsPerBeat}
              scrollX={scrollX}
              width={800}
              height={60}
              clipColor={clipColor}
              onVelocityChange={handleVelocityChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
