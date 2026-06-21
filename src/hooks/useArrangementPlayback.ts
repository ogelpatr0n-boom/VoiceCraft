import { useEffect, useRef } from 'react';
import { useProjectStore } from '../stores/project-store';
import { useTimelineStore } from '../stores/timeline-store';
import { useInstrumentStore } from '../stores/instrument-store';
import { arrangementEngine } from '../audio/arrangement-engine';
import { useUIStore } from '../stores/ui-store';

export function useArrangementPlayback() {
  const isPlaying = useProjectStore(s => s.isPlaying);
  const bpm = useProjectStore(s => s.bpm);
  const clips = useTimelineStore(s => s.clips);
  const instruments = useInstrumentStore(s => s.instruments);
  const currentView = useUIStore(s => s.currentView);
  const wasPlayingRef = useRef(false);

  // Only run arrangement scheduling when in arrangement view
  useEffect(() => {
    if (currentView !== 'arrange') return;

    if (isPlaying && !wasPlayingRef.current) {
      // Just started playing — schedule all clips
      arrangementEngine.scheduleClips(clips, instruments, bpm);
    } else if (!isPlaying && wasPlayingRef.current) {
      // Just stopped — clear all scheduled
      arrangementEngine.clearScheduled();
    }

    wasPlayingRef.current = isPlaying;
  }, [isPlaying, currentView, clips, instruments, bpm]);

  // Re-schedule if clips change while playing in arrange view
  useEffect(() => {
    if (isPlaying && currentView === 'arrange') {
      arrangementEngine.scheduleClips(clips, instruments, bpm);
    }
  }, [clips]); // eslint-disable-line react-hooks/exhaustive-deps
}
