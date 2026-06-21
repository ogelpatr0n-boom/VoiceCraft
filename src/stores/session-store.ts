import { create } from 'zustand';

interface SessionState {
  projectName: string;
  isDirty: boolean;
  lastSaved: string | null;
  setProjectName: (name: string) => void;
  markDirty: () => void;
  markSaved: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  projectName: 'Untitled Project',
  isDirty: false,
  lastSaved: null,
  setProjectName: (name) => set({ projectName: name }),
  markDirty: () => set({ isDirty: true }),
  markSaved: () => set({ isDirty: false, lastSaved: new Date().toLocaleTimeString() }),
}));
