import { useEffect, useState, useRef } from 'react';
import { loopEngine } from '../../audio/loops/loop-engine';

interface PlayheadProps {
  totalSteps: number;
  stepWidth: number;
  height: number;
  offsetLeft?: number;
  isPlaying: boolean;
}

export function Playhead({
  totalSteps,
  stepWidth,
  height,
  offsetLeft = 0,
  isPlaying,
}: PlayheadProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      setCurrentStep(-1);
      return;
    }

    const updatePlayhead = () => {
      const step = loopEngine.getCurrentStep() % totalSteps;
      setCurrentStep(step);
      animationRef.current = requestAnimationFrame(updatePlayhead);
    };

    animationRef.current = requestAnimationFrame(updatePlayhead);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, totalSteps]);

  if (!isPlaying || currentStep < 0) {
    return null;
  }

  const left = offsetLeft + currentStep * stepWidth + stepWidth / 2;

  return (
    <div
      className="pattern-playhead"
      style={{
        left: `${left}px`,
        height: `${height}px`,
      }}
    >
      <div className="playhead-line" />
    </div>
  );
}

interface LoopIndicatorProps {
  loopCount: number;
  patternIds: string[];
}

export function LoopIndicator({ loopCount, patternIds }: LoopIndicatorProps) {
  if (loopCount === 0) return null;

  return (
    <div className="loop-indicator">
      <div className="loop-indicator-dot" />
      <span className="loop-indicator-text">
        {loopCount} pattern{loopCount > 1 ? 's' : ''} looping
      </span>
    </div>
  );
}

interface BeatIndicatorProps {
  currentBeat: number;
  currentBar: number;
  totalBars: number;
  isPlaying: boolean;
}

export function BeatIndicator({
  currentBeat,
  currentBar,
  totalBars,
  isPlaying,
}: BeatIndicatorProps) {
  const totalBeats = totalBars * 4;

  return (
    <div className="beat-indicator-display">
      <div className="beat-counter">
        {isPlaying ? `${currentBar + 1}.${currentBeat + 1}` : '1.1'}
      </div>
      <div className="beat-dots">
        {Array.from({ length: Math.min(totalBeats, 16) }, (_, i) => (
          <div
            key={i}
            className={`beat-dot ${
              isPlaying && i === currentBar * 4 + currentBeat ? 'active' : ''
            } ${i % 4 === 0 ? 'downbeat' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
