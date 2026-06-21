import { useRef, useState } from 'react';
import { useUIStore } from '../../stores/ui-store';
import { useSessionStore } from '../../stores/session-store';
import { TransportBar } from '../controls/TransportBar';
import {
  exportProjectFile,
  importProjectFile,
  loadProject,
  loadAutosave,
  newProject,
} from '../../utils/persistence';

export function Header() {
  const toggleSidebar = useUIStore(s => s.toggleSidebar);
  const { projectName, setProjectName, isDirty, lastSaved, markSaved } = useSessionStore();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(projectName);
  const nameRef = useRef<HTMLInputElement>(null);

  function handleNameClick() {
    setNameInput(projectName);
    setEditingName(true);
    setTimeout(() => nameRef.current?.select(), 0);
  }

  function commitName() {
    const trimmed = nameInput.trim() || 'Untitled Project';
    setProjectName(trimmed);
    setEditingName(false);
  }

  function handleSave() {
    exportProjectFile(projectName);
    markSaved();
  }

  async function handleLoad() {
    try {
      const project = await importProjectFile();
      newProject();
      loadProject(project);
      setProjectName(project.name);
      markSaved();
    } catch (e) {
      if ((e as Error).message !== 'No file selected') {
        alert('Could not load project: ' + (e as Error).message);
      }
    }
  }

  function handleNew() {
    if (isDirty) {
      const ok = confirm('You have unsaved changes. Start a new project anyway?');
      if (!ok) return;
    }
    newProject();
    setProjectName('Untitled Project');
    markSaved();
  }

  function handleRecover() {
    const saved = loadAutosave();
    if (!saved) { alert('No auto-save found.'); return; }
    const ok = confirm(`Recover "${saved.name}" from ${new Date(saved.savedAt).toLocaleString()}?`);
    if (!ok) return;
    newProject();
    loadProject(saved);
    setProjectName(saved.name);
    markSaved();
  }

  return (
    <header className="header">
      <button className="btn btn--icon" onClick={toggleSidebar} title="Toggle sidebar">
        &#9776;
      </button>

      <span className="header__logo">VoiceCraft</span>

      {/* Project name */}
      <div className="header__project">
        {editingName ? (
          <input
            ref={nameRef}
            className="header__project-input"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false); }}
          />
        ) : (
          <button className="header__project-name" onClick={handleNameClick} title="Click to rename">
            {projectName}{isDirty ? ' •' : ''}
          </button>
        )}
        {lastSaved && !isDirty && (
          <span className="header__saved-time">Saved {lastSaved}</span>
        )}
      </div>

      <TransportBar />

      {/* Project actions */}
      <div className="header__actions">
        <button className="btn btn--sm" onClick={handleNew} title="New project">New</button>
        <button className="btn btn--sm btn--primary" onClick={handleSave} title="Save project file">Save</button>
        <button className="btn btn--sm" onClick={handleLoad} title="Load project file">Load</button>
        <button className="btn btn--sm btn--ghost" onClick={handleRecover} title="Recover auto-save">Recover</button>
      </div>
    </header>
  );
}
