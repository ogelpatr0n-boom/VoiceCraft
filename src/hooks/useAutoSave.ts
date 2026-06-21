import { useEffect, useRef } from 'react';
import { usePatternStore } from '../stores/pattern-store';
import { useInstrumentStore } from '../stores/instrument-store';
import { useTimelineStore } from '../stores/timeline-store';
import { useSessionStore } from '../stores/session-store';
import { autoSave } from '../utils/persistence';

const DEBOUNCE_MS = 2000;

export function useAutoSave() {
  const projectName = useSessionStore(s => s.projectName);
  const markDirty = useSessionStore(s => s.markDirty);
  const markSaved = useSessionStore(s => s.markSaved);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const flush = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        autoSave(projectName);
        markSaved();
      }, DEBOUNCE_MS);
    };

    // Subscribe to all three stores
    const unsubPattern = usePatternStore.subscribe(flush);
    const unsubInstrument = useInstrumentStore.subscribe(flush);
    const unsubTimeline = useTimelineStore.subscribe(flush);

    // Mark dirty immediately on any change
    const markD = () => markDirty();
    const unsubPatternD = usePatternStore.subscribe(markD);
    const unsubInstrumentD = useInstrumentStore.subscribe(markD);
    const unsubTimelineD = useTimelineStore.subscribe(markD);

    return () => {
      unsubPattern();
      unsubInstrument();
      unsubTimeline();
      unsubPatternD();
      unsubInstrumentD();
      unsubTimelineD();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [projectName, markDirty, markSaved]);
}
