import { useUIStore, type ViewName } from '../../stores/ui-store';

const NAV_ITEMS: { view: ViewName; label: string; icon: string }[] = [
  { view: 'session',     label: 'Session',    icon: '🎯' },
  { view: 'arrange',     label: 'Arrange',    icon: '🎼' },
  { view: 'instruments', label: 'Instruments',icon: '🎹' },
  { view: 'piano-roll',  label: 'Piano Roll', icon: '🎵' },
  { view: 'live',        label: 'Live',       icon: '🎤' },
  { view: 'tuner',       label: 'Tuner',      icon: '🎸' },
  { view: 'mixer',       label: 'Mixer',      icon: '🎛' },
  { view: 'loops',       label: 'Loops',      icon: '🔁' },
  { view: 'chords',      label: 'Chords',     icon: '🎶' },
  { view: 'ai-studio',   label: 'AI Studio',  icon: '✨' },
  { view: 'export',      label: 'Export',     icon: '💾' },
  { view: 'help',        label: 'Help',       icon: '❓' },
];

export function Sidebar() {
  const currentView = useUIStore(s => s.currentView);
  const setCurrentView = useUIStore(s => s.setCurrentView);
  const sidebarOpen = useUIStore(s => s.sidebarOpen);

  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.view}
            className={`sidebar__item ${currentView === item.view ? 'sidebar__item--active' : ''}`}
            onClick={() => setCurrentView(item.view)}
          >
            <span className="sidebar__item-icon">{item.icon}</span>
            {sidebarOpen && <span className="sidebar__item-label">{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}
