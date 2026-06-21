# VoiceCraft Development Breadcrumb

**Last Updated:** June 21, 2026
**Session Status:** Major Phase 1–3 Complete — Ready for Phase 4 (Polish)

---

## What Was Built This Session

### Phase 1 — Foundation ✅
1. **Project save/load** (`src/utils/persistence.ts`, `src/stores/session-store.ts`)
   - Auto-save to localStorage every 2 seconds after changes
   - Export project as `.voicecraft` JSON file
   - Import project from file
   - New project clears all state
   - Recover from auto-save (browser crash recovery)
   - Header: project name (click to rename), Save/Load/New/Recover buttons
   - Dirty indicator (• after name when unsaved)

2. **Arrangement view audio playback** (`src/audio/arrangement-engine.ts`, `src/hooks/useArrangementPlayback.ts`)
   - MIDI clips in timeline now play back via Tone.js Part scheduling
   - Clips are re-scheduled when transport plays in Arrange view
   - `handleClipMove` now correctly calls `moveClip` in timeline store

3. **Undo/redo** (`src/stores/history-store.ts`, `src/hooks/useUndoRedo.ts`)
   - Ctrl+Z / Cmd+Z to undo
   - Ctrl+Y / Ctrl+Shift+Z to redo
   - 50-step history for pattern and timeline store changes
   - `pushSnapshot()` exported for calling before any major mutation

### Phase 2 — Voice Features ✅
4. **LiveView rebuilt** (`src/components/views/LiveView.tsx`)
   - Auto-tune presets: Off / Subtle / Natural / T-Pain / Robotic
   - Fine-tune knobs: Retune Speed / Amount / Humanize
   - Key selector for scale-aware pitch correction
   
5. **Vocal Harmonizer** (built into LiveView)
   - Enable/disable toggle
   - Select harmony intervals: 3rd / 5th / Octave / -3rd / -5th
   - Key-locked (respects pitch correction key)

6. **Vocal FX Rack** (built into LiveView)
   - 8 presets: Clean / Studio / Cathedral / Stadium / Telephone / Radio / Lo-Fi / Robot
   - One-tap apply
   - Effect params defined (ready to wire into engine chain)

### Phase 3 — AI Integration ✅
7. **AI Studio view** (`src/components/views/AiStudioView.tsx`)
   - New sidebar item: ✨ AI Studio
   - 4 categories: Beat/Song (Suno) / Music (Veo Lite) / AI Vocal (ElevenLabs) / Sound FX
   - User enters Kie.ai API key once (stored in localStorage)
   - Prompt → Kie.ai API → polls until complete → result URL shown
   - Audio player inline for preview
   - Auto-adds generated clip to timeline as audio clip
   - Prompt suggestions per category
   - Cost shown per generation type

---

## Remaining Tasks

### Phase 4 — Polish
- [ ] **Task 7**: Wire per-track effects routing (reverb/delay/EQ per instrument)
- [ ] **Task 9**: Loop library with genre samples (200+ royalty-free loops)
- [ ] **Task 10**: Chord progression builder
- [ ] **Task 11**: Finish piano roll tool interactions
- [ ] **Task 12**: Audio file import (drag & drop WAV/MP3)
- [ ] **Task 13**: Video export + social share (Web Share API)

### Phase 5 — Platform
- [ ] **Task 14**: PWA manifest + service worker (offline, install prompt)
- [ ] **Task 15**: Capacitor iOS/Android build

---

## How to Run

```bash
cd C:\Users\OGElP\VoiceCraft
npm run dev
```

Opens at: http://localhost:5173

```bash
npm run build   # Production build
npm run preview # Preview production build
```

---

## Key New Files

| File | Purpose |
|------|---------|
| `src/utils/persistence.ts` | Project serialize/deserialize, save/load/export/import |
| `src/stores/session-store.ts` | Project name, dirty state, last-saved time |
| `src/stores/history-store.ts` | Undo/redo history (50 steps) |
| `src/hooks/useAutoSave.ts` | Debounced auto-save to localStorage |
| `src/hooks/useUndoRedo.ts` | Keyboard shortcut handler + pushSnapshot export |
| `src/hooks/useArrangementPlayback.ts` | Schedules timeline clips when transport plays |
| `src/audio/arrangement-engine.ts` | Tone.js Part scheduling for MIDI clips |
| `src/components/views/LiveView.tsx` | Rebuilt: presets, harmonizer, vocal FX rack |
| `src/components/views/AiStudioView.tsx` | AI Studio: Kie.ai beat/vocal/sfx generation |

---

## Known Issues
- Vocal FX rack presets are UI-only — need to wire effect params into audio engine chain
- Harmonizer UI present but audio generation not yet wired (needs pitch detection output → synthesis)
- Arrangement view plays MIDI clips; audio clip playback needs AudioBuffer loading
- Bundle size warning (665KB) — fix with dynamic imports / code splitting later
- `seedream-4-5-edit` model may need same params fix as `t2i` (not yet tested)
