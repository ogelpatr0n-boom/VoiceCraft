import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  content: ReactNode;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'type' | 'wait' | 'navigate';
  actionTarget?: string;
  highlightArea?: boolean;
  nextOnAction?: boolean;
  skipable?: boolean;
}

export interface Tutorial {
  id: string;
  name: string;
  description: string;
  category: 'getting-started' | 'instruments' | 'recording' | 'mixing' | 'advanced';
  estimatedTime: string;
  steps: TutorialStep[];
}

interface TutorialSystemProps {
  tutorial: Tutorial | null;
  onComplete?: () => void;
  onExit?: () => void;
}

export function TutorialSystem({ tutorial, onComplete, onExit }: TutorialSystemProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const currentStep = tutorial?.steps[currentStepIndex];

  // Update highlight position when step changes
  useEffect(() => {
    if (!currentStep?.targetSelector) {
      setHighlightRect(null);
      return;
    }

    const updateHighlight = () => {
      const element = document.querySelector(currentStep.targetSelector!);
      if (element) {
        setHighlightRect(element.getBoundingClientRect());
      }
    };

    updateHighlight();
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight);

    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight);
    };
  }, [currentStep]);

  // Handle action-triggered navigation
  useEffect(() => {
    if (!currentStep?.nextOnAction || !currentStep?.actionTarget) return;

    const handleAction = () => {
      handleNext();
    };

    const target = document.querySelector(currentStep.actionTarget);
    if (target) {
      target.addEventListener('click', handleAction);
      return () => target.removeEventListener('click', handleAction);
    }
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (!tutorial) return;

    if (currentStepIndex < tutorial.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Tutorial complete
      markTutorialComplete(tutorial.id);
      onComplete?.();
    }
  }, [tutorial, currentStepIndex, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex]);

  const handleExit = useCallback(() => {
    onExit?.();
  }, [onExit]);

  const handleSkip = useCallback(() => {
    if (tutorial) {
      markTutorialComplete(tutorial.id);
    }
    onComplete?.();
  }, [tutorial, onComplete]);

  if (!tutorial || !currentStep) return null;

  const progress = ((currentStepIndex + 1) / tutorial.steps.length) * 100;

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (!highlightRect || currentStep.position === 'center') {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 20;
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 10001,
    };

    switch (currentStep.position) {
      case 'bottom':
        style.top = highlightRect.bottom + padding;
        style.left = highlightRect.left + highlightRect.width / 2;
        style.transform = 'translateX(-50%)';
        break;
      case 'top':
        style.bottom = window.innerHeight - highlightRect.top + padding;
        style.left = highlightRect.left + highlightRect.width / 2;
        style.transform = 'translateX(-50%)';
        break;
      case 'left':
        style.right = window.innerWidth - highlightRect.left + padding;
        style.top = highlightRect.top + highlightRect.height / 2;
        style.transform = 'translateY(-50%)';
        break;
      case 'right':
        style.left = highlightRect.right + padding;
        style.top = highlightRect.top + highlightRect.height / 2;
        style.transform = 'translateY(-50%)';
        break;
      default:
        style.top = highlightRect.bottom + padding;
        style.left = highlightRect.left + highlightRect.width / 2;
        style.transform = 'translateX(-50%)';
    }

    return style;
  };

  return (
    <div className="tutorial-overlay">
      {/* Dimmed background with highlight cutout */}
      <svg className="tutorial-backdrop" width="100%" height="100%">
        <defs>
          <mask id="highlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {highlightRect && currentStep.highlightArea !== false && (
              <rect
                x={highlightRect.left - 8}
                y={highlightRect.top - 8}
                width={highlightRect.width + 16}
                height={highlightRect.height + 16}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#highlight-mask)"
        />
      </svg>

      {/* Highlight border */}
      {highlightRect && currentStep.highlightArea !== false && (
        <div
          className="tutorial-highlight"
          style={{
            position: 'fixed',
            left: highlightRect.left - 8,
            top: highlightRect.top - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            border: '2px solid var(--accent-cyan)',
            borderRadius: '8px',
            boxShadow: '0 0 0 4px rgba(0, 212, 255, 0.2)',
            pointerEvents: 'none',
            zIndex: 10000,
          }}
        />
      )}

      {/* Tutorial tooltip */}
      <div className="tutorial-tooltip" style={getTooltipStyle()}>
        <div className="tutorial-tooltip-header">
          <span className="tutorial-step-count">
            Step {currentStepIndex + 1} of {tutorial.steps.length}
          </span>
          <button className="tutorial-close" onClick={handleExit}>
            x
          </button>
        </div>

        <div className="tutorial-tooltip-content">
          <h3>{currentStep.title}</h3>
          <div className="tutorial-step-content">{currentStep.content}</div>
        </div>

        <div className="tutorial-progress-bar">
          <div className="tutorial-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="tutorial-tooltip-actions">
          {currentStepIndex > 0 && (
            <button className="btn btn--sm" onClick={handlePrev}>
              Previous
            </button>
          )}
          {currentStep.skipable !== false && (
            <button className="btn btn--sm" onClick={handleSkip}>
              Skip Tutorial
            </button>
          )}
          <button className="btn btn--sm btn--primary" onClick={handleNext}>
            {currentStepIndex === tutorial.steps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Utility functions
export function markTutorialComplete(tutorialId: string): void {
  const completed = getCompletedTutorials();
  if (!completed.includes(tutorialId)) {
    completed.push(tutorialId);
    localStorage.setItem('voicecraft-completed-tutorials', JSON.stringify(completed));
  }
}

export function getCompletedTutorials(): string[] {
  const saved = localStorage.getItem('voicecraft-completed-tutorials');
  return saved ? JSON.parse(saved) : [];
}

export function isTutorialComplete(tutorialId: string): boolean {
  return getCompletedTutorials().includes(tutorialId);
}

export function resetTutorialProgress(): void {
  localStorage.removeItem('voicecraft-completed-tutorials');
}
