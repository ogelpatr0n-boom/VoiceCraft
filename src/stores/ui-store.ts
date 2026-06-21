import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewName = 'session' | 'arrange' | 'instruments' | 'piano-roll' | 'live' | 'mixer' | 'export' | 'ai-studio' | 'loops' | 'tuner' | 'chords' | 'help';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

interface UIState {
  currentView: ViewName;
  sidebarOpen: boolean;
  showEffectsPanel: boolean;
  showSettings: boolean;

  // Beginner-friendly settings
  experienceLevel: ExperienceLevel;
  showTooltips: boolean;
  showQuickStart: boolean;
  showKeyboardHints: boolean;
  showWelcomeModal: boolean;
  showShortcutsHelp: boolean;

  // Actions
  setView: (view: ViewName) => void;
  setCurrentView: (view: ViewName) => void;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
  setShowEffectsPanel: (v: boolean) => void;
  toggleEffectsPanel: () => void;
  setShowSettings: (v: boolean) => void;

  // Beginner mode actions
  setExperienceLevel: (level: ExperienceLevel) => void;
  setShowTooltips: (v: boolean) => void;
  setShowQuickStart: (v: boolean) => void;
  setShowKeyboardHints: (v: boolean) => void;
  setShowWelcomeModal: (v: boolean) => void;
  setShowShortcutsHelp: (v: boolean) => void;
  isBeginnerMode: () => boolean;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      currentView: 'session',
      sidebarOpen: true,
      showEffectsPanel: false,
      showSettings: false,

      // Beginner-friendly defaults
      experienceLevel: 'beginner',
      showTooltips: true,
      showQuickStart: true,
      showKeyboardHints: true,
      showWelcomeModal: false,
      showShortcutsHelp: false,

      setView: (view) => set({ currentView: view }),
      setCurrentView: (view) => set({ currentView: view }),
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setShowEffectsPanel: (v) => set({ showEffectsPanel: v }),
      toggleEffectsPanel: () => set((s) => ({ showEffectsPanel: !s.showEffectsPanel })),
      setShowSettings: (v) => set({ showSettings: v }),

      setExperienceLevel: (level) => {
        set({ experienceLevel: level });
        // Auto-adjust settings based on level
        if (level === 'advanced') {
          set({ showTooltips: false, showQuickStart: false, showKeyboardHints: false });
        } else if (level === 'beginner') {
          set({ showTooltips: true, showQuickStart: true, showKeyboardHints: true });
        }
      },
      setShowTooltips: (v) => set({ showTooltips: v }),
      setShowQuickStart: (v) => set({ showQuickStart: v }),
      setShowKeyboardHints: (v) => set({ showKeyboardHints: v }),
      setShowWelcomeModal: (v) => set({ showWelcomeModal: v }),
      setShowShortcutsHelp: (v) => set({ showShortcutsHelp: v }),
      isBeginnerMode: () => get().experienceLevel === 'beginner',
    }),
    {
      name: 'voicecraft-ui-preferences',
      partialize: (state) => ({
        experienceLevel: state.experienceLevel,
        showTooltips: state.showTooltips,
        showQuickStart: state.showQuickStart,
        showKeyboardHints: state.showKeyboardHints,
      }),
    }
  )
);
