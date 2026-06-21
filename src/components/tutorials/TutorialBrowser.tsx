import { useState } from 'react';
import { TUTORIALS, getTutorialsByCategory } from './tutorials';
import {
  TutorialSystem,
  isTutorialComplete,
  resetTutorialProgress,
  type Tutorial,
} from './TutorialSystem';

interface TutorialBrowserProps {
  onClose?: () => void;
}

const CATEGORY_INFO: Record<string, { label: string; icon: string; description: string }> = {
  'getting-started': {
    label: 'Getting Started',
    icon: 'Start',
    description: 'Essential tutorials for new users',
  },
  instruments: {
    label: 'Instruments',
    icon: 'Keys',
    description: 'Learn to create beats and melodies',
  },
  recording: {
    label: 'Recording',
    icon: 'Mic',
    description: 'Master vocal and audio recording',
  },
  mixing: {
    label: 'Mixing',
    icon: 'Sliders',
    description: 'Balance and polish your tracks',
  },
  advanced: {
    label: 'Advanced',
    icon: 'Pro',
    description: 'Tips for power users',
  },
};

export function TutorialBrowser({ onClose }: TutorialBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);

  const categories = Object.keys(CATEGORY_INFO);

  const displayedTutorials =
    selectedCategory === 'all'
      ? TUTORIALS
      : getTutorialsByCategory(selectedCategory as Tutorial['category']);

  const completedCount = TUTORIALS.filter(t => isTutorialComplete(t.id)).length;
  const totalCount = TUTORIALS.length;

  const handleStartTutorial = (tutorial: Tutorial) => {
    setActiveTutorial(tutorial);
  };

  const handleTutorialComplete = () => {
    setActiveTutorial(null);
  };

  const handleTutorialExit = () => {
    setActiveTutorial(null);
  };

  const handleResetProgress = () => {
    if (confirm('Reset all tutorial progress? This cannot be undone.')) {
      resetTutorialProgress();
      // Force re-render
      setSelectedCategory(selectedCategory);
    }
  };

  if (activeTutorial) {
    return (
      <TutorialSystem
        tutorial={activeTutorial}
        onComplete={handleTutorialComplete}
        onExit={handleTutorialExit}
      />
    );
  }

  return (
    <div className="tutorial-browser">
      <div className="tutorial-browser-header">
        <div>
          <h2>Learn VoiceCraft</h2>
          <p className="tutorial-progress-text">
            {completedCount} of {totalCount} tutorials completed
          </p>
        </div>
        <div className="tutorial-header-actions">
          <button className="btn btn--sm" onClick={handleResetProgress}>
            Reset Progress
          </button>
          {onClose && (
            <button className="btn btn--sm" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="tutorial-categories">
        <button
          className={`category-chip ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {CATEGORY_INFO[cat].label}
          </button>
        ))}
      </div>

      {/* Tutorial list */}
      <div className="tutorial-list">
        {displayedTutorials.map(tutorial => {
          const isComplete = isTutorialComplete(tutorial.id);
          const categoryInfo = CATEGORY_INFO[tutorial.category];

          return (
            <div
              key={tutorial.id}
              className={`tutorial-card ${isComplete ? 'completed' : ''}`}
            >
              <div className="tutorial-card-header">
                <span className="tutorial-category-badge">{categoryInfo.label}</span>
                {isComplete && <span className="tutorial-complete-badge">Completed</span>}
              </div>

              <h3>{tutorial.name}</h3>
              <p>{tutorial.description}</p>

              <div className="tutorial-card-footer">
                <span className="tutorial-time">{tutorial.estimatedTime}</span>
                <span className="tutorial-steps">{tutorial.steps.length} steps</span>
                <button
                  className="btn btn--sm btn--primary"
                  onClick={() => handleStartTutorial(tutorial)}
                >
                  {isComplete ? 'Review' : 'Start'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {displayedTutorials.length === 0 && (
        <div className="tutorial-empty">
          <p>No tutorials in this category yet.</p>
        </div>
      )}
    </div>
  );
}
