import { useState, useEffect } from 'react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  // Transport
  { keys: ['Space'], description: 'Play / Pause', category: 'Transport' },
  { keys: ['Enter'], description: 'Stop and return to start', category: 'Transport' },
  { keys: ['R'], description: 'Start / Stop recording', category: 'Transport' },
  { keys: ['L'], description: 'Toggle loop mode', category: 'Transport' },

  // Editing
  { keys: ['Ctrl', 'Z'], description: 'Undo', category: 'Editing' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo', category: 'Editing' },
  { keys: ['Ctrl', 'X'], description: 'Cut selection', category: 'Editing' },
  { keys: ['Ctrl', 'C'], description: 'Copy selection', category: 'Editing' },
  { keys: ['Ctrl', 'V'], description: 'Paste', category: 'Editing' },
  { keys: ['Delete'], description: 'Delete selection', category: 'Editing' },
  { keys: ['Ctrl', 'A'], description: 'Select all', category: 'Editing' },

  // Tracks
  { keys: ['M'], description: 'Mute selected track', category: 'Tracks' },
  { keys: ['S'], description: 'Solo selected track', category: 'Tracks' },
  { keys: ['Ctrl', 'N'], description: 'New track', category: 'Tracks' },

  // Navigation
  { keys: ['1'], description: 'Go to Live view', category: 'Navigation' },
  { keys: ['2'], description: 'Go to Instruments view', category: 'Navigation' },
  { keys: ['3'], description: 'Go to Session view', category: 'Navigation' },
  { keys: ['4'], description: 'Go to Mixer view', category: 'Navigation' },
  { keys: ['5'], description: 'Go to Editor view', category: 'Navigation' },
  { keys: ['?'], description: 'Show this help', category: 'Navigation' },
  { keys: ['Escape'], description: 'Close dialogs / Deselect', category: 'Navigation' },

  // Zoom
  { keys: ['Ctrl', '+'], description: 'Zoom in', category: 'Zoom' },
  { keys: ['Ctrl', '-'], description: 'Zoom out', category: 'Zoom' },
  { keys: ['Ctrl', '0'], description: 'Fit to window', category: 'Zoom' },
];

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  // Group shortcuts by category
  const groupedShortcuts = SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>

        <div className="shortcuts-content">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category} className="shortcut-category">
              <h3>{category}</h3>
              <div className="shortcut-list">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="shortcut-item">
                    <div className="shortcut-keys">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          <kbd>{key}</kbd>
                          {keyIndex < shortcut.keys.length - 1 && ' + '}
                        </span>
                      ))}
                    </div>
                    <span className="shortcut-description">{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="shortcuts-footer">
          <p>Press <kbd>?</kbd> to toggle this help</p>
        </div>
      </div>
    </div>
  );
}

// Hook to use keyboard shortcuts globally
export function useKeyboardShortcuts(callbacks: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Build key combo string
      let combo = '';
      if (e.ctrlKey || e.metaKey) combo += 'ctrl+';
      if (e.shiftKey) combo += 'shift+';
      if (e.altKey) combo += 'alt+';
      combo += e.key.toLowerCase();

      // Check if we have a callback for this combo
      if (callbacks[combo]) {
        e.preventDefault();
        callbacks[combo]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callbacks]);
}
