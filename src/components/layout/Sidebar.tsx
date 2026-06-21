import { useUIStore, type ViewName } from '../../stores/ui-store';

const NAV_ITEMS: { view: ViewName; label: string; icon: string }[] = [
  { view: 'session', label: 'Session', icon: '\u{1F3AF}' },
  { view: 'arrange', label: 'Arrange', icon: '\u{1F3BC}' },
  { view: 'instruments', label: 'Instruments', icon: '\u{1F3B9}' },
  { view: 'piano-roll', label: 'Piano Roll', icon: '\u{1F3B5}' },
  { view: 'live', label: 'Live', icon: '\u{1F3A4}' },
  { view: 'mixer', label: 'Mixer', icon: '\u{1F39B}' },
  { view: 'loops', label: 'Loops', icon: '\u{1F501}' },
  { view: 'tuner', label: 'Tuner', icon: '\u{1F3B8}' },
  { view: 'chords', label: 'Chords', icon: '\u{1F3B9}' },
  { view: 'ai-studio', label: 'AI Studio', icon: '\u{2728}' },
  { view: 'export', label: 'Export', icon: '\u{1F4BE}' },
  { view: 'help', label: 'Help', icon: '\u{2753}' },
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
