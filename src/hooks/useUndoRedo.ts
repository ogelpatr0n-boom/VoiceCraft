import { useEffect } from 'react';
import { useHistoryStore } from '../stores/history-store';

export function useUndoRedo() {
  const { undo, redo } = useHistoryStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (meta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);
}

// Call this before any significant mutation to save a restore point
export function pushSnapshot() {
  useHistoryStore.getState().pushSnapshot();
}
