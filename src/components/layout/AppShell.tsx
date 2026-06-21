import { useEffect } from 'react';
import { useUIStore } from '../../stores/ui-store';
import { useSessionStore } from '../../stores/session-store';
import { loadAutosave, loadProject } from '../../utils/persistence';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useArrangementPlayback } from '../../hooks/useArrangementPlayback';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { useTrackFxSync } from '../../hooks/useTrackFxSync';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { SessionView } from '../views/SessionView';
import { ArrangementView } from '../views/ArrangementView';
import { InstrumentsView } from '../views/InstrumentsView';
import { PianoRollView } from '../views/PianoRollView';
import { LiveView } from '../views/LiveView';
import { MixerView } from '../views/MixerView';
import { ExportView } from '../views/ExportView';
import { HelpView } from '../views/HelpView';
import { AiStudioView } from '../views/AiStudioView';
import { LoopBrowserView } from '../views/LoopBrowserView';
import { TunerView } from '../views/TunerView';
import { ChordBuilderView } from '../views/ChordBuilderView';
import { InstallPrompt } from '../shared/InstallPrompt';

function MainContent() {
  const currentView = useUIStore(s => s.currentView);

  switch (currentView) {
    case 'session': return <SessionView />;
    case 'arrange': return <ArrangementView />;
    case 'instruments': return <InstrumentsView />;
    case 'piano-roll': return <PianoRollView />;
    case 'live': return <LiveView />;
    case 'mixer': return <MixerView />;
    case 'export': return <ExportView />;
    case 'ai-studio': return <AiStudioView />;
    case 'loops': return <LoopBrowserView />;
    case 'tuner': return <TunerView />;
    case 'chords': return <ChordBuilderView />;
    case 'help': return <HelpView />;
    default: return <SessionView />;
  }
}

export function AppShell() {
  const sidebarOpen = useUIStore(s => s.sidebarOpen);
  const { setProjectName, markSaved } = useSessionStore();

  // Global hooks
  useAutoSave();
  useArrangementPlayback();
  useUndoRedo();
  useTrackFxSync();

  // Restore autosave on first load
  useEffect(() => {
    const saved = loadAutosave();
    if (saved) {
      loadProject(saved);
      setProjectName(saved.name);
      markSaved();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`app-shell ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
      <Header />
      <Sidebar />
      <main className="main-content">
        <MainContent />
      </main>
      <StatusBar />
      <InstallPrompt />
    </div>
  );
}
