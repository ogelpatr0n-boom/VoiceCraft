import { useState } from 'react';

interface QuickStartStep {
  id: string;
  title: string;
  description: string;
  action?: string;
  completed?: boolean;
}

interface QuickStartPanelProps {
  view: string;
  onStepClick?: (stepId: string) => void;
}

const VIEW_STEPS: Record<string, QuickStartStep[]> = {
  live: [
    {
      id: 'enable-mic',
      title: 'Enable Microphone',
      description: 'Click the mic button to start capturing audio input',
      action: 'Click the microphone icon',
    },
    {
      id: 'select-key',
      title: 'Choose Your Key',
      description: 'Select the musical key of your song for accurate pitch correction',
      action: 'Use the key selector dropdown',
    },
    {
      id: 'adjust-speed',
      title: 'Set Correction Speed',
      description: 'Adjust how quickly pitch is corrected (fast = robotic, slow = natural)',
      action: 'Move the retune speed slider',
    },
    {
      id: 'sing',
      title: 'Start Singing!',
      description: 'Sing into your microphone and hear real-time pitch correction',
      action: 'Just start singing',
    },
  ],
  instruments: [
    {
      id: 'select-instrument',
      title: 'Choose an Instrument',
      description: 'Select drums, bass, or synth from the tabs above',
      action: 'Click an instrument tab',
    },
    {
      id: 'create-pattern',
      title: 'Create a Pattern',
      description: 'Click steps in the sequencer grid to add notes',
      action: 'Click on the grid cells',
    },
    {
      id: 'start-loop',
      title: 'Start the Loop',
      description: 'Click the Loop button to hear your pattern repeat',
      action: 'Press the Loop button',
    },
    {
      id: 'save-pattern',
      title: 'Save to Session',
      description: 'When happy with your pattern, save it to use in your song',
      action: 'Click Save to Session',
    },
  ],
  session: [
    {
      id: 'view-tracks',
      title: 'View Your Tracks',
      description: 'Each row represents a track for a different instrument',
      action: 'Look at the track list',
    },
    {
      id: 'add-clips',
      title: 'Add Clips',
      description: 'Clips appear when you save patterns from the Instruments view',
      action: 'Create patterns first',
    },
    {
      id: 'record-vocals',
      title: 'Record Vocals',
      description: 'Click Record Vocals to add your voice to the mix',
      action: 'Click the Record button',
    },
    {
      id: 'play-all',
      title: 'Play Everything',
      description: 'Hit Play to hear all your tracks together',
      action: 'Press Play All',
    },
  ],
  mixer: [
    {
      id: 'adjust-levels',
      title: 'Balance Levels',
      description: 'Use the faders to set the volume of each track',
      action: 'Move the volume faders',
    },
    {
      id: 'add-effects',
      title: 'Add Effects',
      description: 'Click on a track to add EQ, compression, and reverb',
      action: 'Select a track channel',
    },
    {
      id: 'set-pan',
      title: 'Pan Sounds',
      description: 'Use pan knobs to position sounds in the stereo field',
      action: 'Adjust the pan controls',
    },
    {
      id: 'master',
      title: 'Master the Mix',
      description: 'Use the master channel to polish the final sound',
      action: 'Click on Master channel',
    },
  ],
  editor: [
    {
      id: 'select-clip',
      title: 'Select a Clip',
      description: 'Click on a clip in the arrangement to edit it',
      action: 'Click on any clip',
    },
    {
      id: 'trim-clip',
      title: 'Trim Audio',
      description: 'Drag the edges of a clip to shorten it',
      action: 'Drag clip edges',
    },
    {
      id: 'add-fades',
      title: 'Add Fades',
      description: 'Create smooth transitions with fade in/out',
      action: 'Use fade handles',
    },
    {
      id: 'pitch-edit',
      title: 'Edit Pitch',
      description: 'Use the pitch editor for detailed vocal tuning',
      action: 'Open pitch editor panel',
    },
  ],
};

export function QuickStartPanel({ view, onStepClick }: QuickStartPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('voicecraft-completed-steps');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const steps = VIEW_STEPS[view] || [];
  const completedCount = steps.filter(s => completedSteps.has(s.id)).length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  const handleStepComplete = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
    localStorage.setItem('voicecraft-completed-steps', JSON.stringify([...newCompleted]));
    onStepClick?.(stepId);
  };

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className={`quick-start-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="quick-start-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="quick-start-title">
          <span className="quick-start-icon">?</span>
          <span>Quick Start Guide</span>
        </div>
        <div className="quick-start-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{completedCount}/{steps.length}</span>
        </div>
        <button className="expand-btn">
          {isExpanded ? '-' : '+'}
        </button>
      </div>

      {isExpanded && (
        <div className="quick-start-steps">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`quick-start-step ${completedSteps.has(step.id) ? 'completed' : ''}`}
              onClick={() => handleStepComplete(step.id)}
            >
              <div className="step-number">
                {completedSteps.has(step.id) ? '✓' : index + 1}
              </div>
              <div className="step-content">
                <h5>{step.title}</h5>
                <p>{step.description}</p>
                {step.action && (
                  <span className="step-action">{step.action}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
