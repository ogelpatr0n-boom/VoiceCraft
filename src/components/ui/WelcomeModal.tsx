import { useState, useEffect } from 'react';

interface WelcomeModalProps {
  onComplete?: () => void;
}

const WELCOME_STEPS = [
  {
    title: 'Welcome to VoiceCraft!',
    description: 'A modern digital audio workstation for creating music and producing vocals.',
    image: null,
    features: [
      'Create beats with virtual instruments',
      'Record and edit vocals',
      'Mix and master your tracks',
      'Export professional audio',
    ],
  },
  {
    title: 'Quick Start Guide',
    description: 'Here\'s how to create your first track:',
    image: null,
    features: [
      '1. Go to Instruments to create a beat pattern',
      '2. Click Loop to hear it repeat',
      '3. Add more instruments and layer sounds',
      '4. Record vocals in the Session view',
      '5. Mix everything in the Mixer',
    ],
  },
  {
    title: 'Navigation',
    description: 'Use the sidebar to access different views:',
    image: null,
    features: [
      'Live - Pitch correction and real-time effects',
      'Instruments - Create beats and melodies',
      'Session - Arrange and record tracks',
      'Mixer - Balance levels and add effects',
      'Editor - Fine-tune your audio',
    ],
  },
  {
    title: 'Keyboard Shortcuts',
    description: 'Speed up your workflow with these shortcuts:',
    image: null,
    features: [
      'Space - Play / Pause',
      'R - Start Recording',
      'M - Mute selected track',
      'S - Solo selected track',
      '? - Show all shortcuts',
    ],
  },
];

export function WelcomeModal({ onComplete }: WelcomeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('voicecraft-welcome-seen');
    if (!hasSeenWelcome) {
      setIsVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < WELCOME_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('voicecraft-welcome-seen', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) {
    return null;
  }

  const step = WELCOME_STEPS[currentStep];

  return (
    <div className="modal-overlay">
      <div className="welcome-modal">
        <button className="modal-close" onClick={handleSkip}>
          Skip
        </button>

        <div className="welcome-content">
          <div className="welcome-header">
            <h2>{step.title}</h2>
            <p>{step.description}</p>
          </div>

          <ul className="welcome-features">
            {step.features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </div>

        <div className="welcome-footer">
          <div className="step-indicators">
            {WELCOME_STEPS.map((_, index) => (
              <div
                key={index}
                className={`step-dot ${index === currentStep ? 'active' : ''}`}
                onClick={() => setCurrentStep(index)}
              />
            ))}
          </div>

          <div className="welcome-actions">
            {currentStep > 0 && (
              <button className="btn" onClick={handlePrev}>
                Previous
              </button>
            )}
            <button className="btn btn--primary" onClick={handleNext}>
              {currentStep === WELCOME_STEPS.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reset welcome modal (for testing)
export function resetWelcome() {
  localStorage.removeItem('voicecraft-welcome-seen');
}
