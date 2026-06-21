import { useInstrumentStore } from '../stores/instrument-store';
import { usePatternStore } from '../stores/pattern-store';
import { useTimelineStore } from '../stores/timeline-store';
import type { InstrumentData } from '../stores/instrument-store';
import type { Pattern } from '../stores/pattern-store';
import type { TimelineTrack, TimelineClip } from '../stores/timeline-store';

const AUTOSAVE_KEY = 'voicecraft_autosave';
const PROJECT_LIST_KEY = 'voicecraft_projects';

export interface VoiceCraftProject {
  version: number;
  name: string;
  savedAt: string;
  bpm: number;
  bars: number;
  instruments: InstrumentData[];
  patterns: Array<[string, Pattern]>;
  activePatternIds: Array<[string, string]>;
  timelineTracks: TimelineTrack[];
  timelineClips: TimelineClip[];
}

export interface SavedProjectMeta {
  id: string;
  name: string;
  savedAt: string;
}

export function serializeProject(name: string): VoiceCraftProject {
  const { instruments } = useInstrumentStore.getState();
  const { patterns, activePatternIds, globalBpm, globalBars } = usePatternStore.getState();
  const { tracks, clips } = useTimelineStore.getState();

  return {
    version: 1,
    name,
    savedAt: new Date().toISOString(),
    bpm: globalBpm,
    bars: globalBars,
    instruments,
    patterns: Array.from(patterns.entries()),
    activePatternIds: Array.from(activePatternIds.entries()),
    timelineTracks: tracks,
    timelineClips: clips,
  };
}

export function loadProject(project: VoiceCraftProject): void {
  // Restore pattern store (Maps need reconstruction)
  const patternMap = new Map<string, Pattern>(project.patterns);
  const activeMap = new Map<string, string>(project.activePatternIds);

  usePatternStore.setState({
    patterns: patternMap,
    activePatternIds: activeMap,
    globalBpm: project.bpm,
    globalBars: project.bars,
  });

  // Restore instrument store
  useInstrumentStore.setState({
    instruments: project.instruments,
    selectedInstrumentId: project.instruments[0]?.id ?? null,
  });

  // Restore timeline
  useTimelineStore.setState({
    tracks: project.timelineTracks,
    clips: project.timelineClips,
    selection: null,
  });
}

export function autoSave(name: string): void {
  try {
    const project = serializeProject(name);
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project));
  } catch {
    // localStorage may be full — fail silently
  }
}

export function loadAutosave(): VoiceCraftProject | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as VoiceCraftProject;
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  localStorage.removeItem(AUTOSAVE_KEY);
}

export function exportProjectFile(name: string): void {
  const project = serializeProject(name);
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^a-z0-9_-]/gi, '_')}.voicecraft`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importProjectFile(): Promise<VoiceCraftProject> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.voicecraft,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const project = JSON.parse(e.target?.result as string) as VoiceCraftProject;
          resolve(project);
        } catch {
          reject(new Error('Invalid project file'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

export function newProject(): void {
  usePatternStore.setState({
    patterns: new Map(),
    activePatternIds: new Map(),
    globalBpm: 120,
    globalBars: 4,
  });
  useInstrumentStore.setState({
    instruments: [],
    selectedInstrumentId: null,
  });
  useTimelineStore.setState({
    tracks: [],
    clips: [],
    selection: null,
  });
}
