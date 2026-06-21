import { useState, useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import { DRUM_PADS } from '../../audio/instruments/drum-machine';
import type { DrumMachine } from '../../audio/instruments/drum-machine';
import { usePatternStore, type DrumPattern } from '../../stores/pattern-store';
import { useLoopPlayback } from '../../hooks/useLoopPlayback';
import { PatternToolbar } from '../patterns/PatternToolbar';
import { Playhead } from '../patterns/Playhead';
import { loopEngine } from '../../audio/loops/loop-engine';

interface StepSequencerProps {
  drumMachine: DrumMachine;
  instrumentId: string;
  steps?: number;
  onPatternChange?: (pattern: boolean[][]) => void;
}

export function StepSequencer({
  drumMachine,
  instrumentId,
  steps = 16,
  onPatternChange,
}: StepSequencerProps) {
  const {
    createDrumPattern,
    updateDrumStep,
    clearDrumPattern,
    randomizeDrumPattern,
    setPatternBars,
    setActivePattern,
    globalBpm,
    setGlobalBpm,
  } = usePatternStore();

  // Use a proper selector to subscribe to pattern changes
  const pattern = usePatternStore((state) => {
    const patternId = state.activePatternIds.get(instrumentId);
    if (!patternId) return undefined;
    return state.patterns.get(patternId) as DrumPattern | undefined;
  });

  const {
    isRunning,
    currentStep,
    startPattern,
    stopPattern,
    togglePattern,
    isPatternLooping,
    activeLoopCount,
    activePatternIds,
  } = useLoopPlayback();

  const [bpm, setBpm] = useState(globalBpm);
  const [swing, setSwing] = useState(0);

  // Create pattern if none exists
  useEffect(() => {
    if (!pattern) {
      createDrumPattern(instrumentId, 'Pattern 1');
    }
  }, [pattern, instrumentId, createDrumPattern]);

  const isLooping = pattern ? isPatternLooping(pattern.id) : false;

  // Sync pattern changes to loop engine for live updates
  useEffect(() => {
    if (pattern && isLooping) {
      loopEngine.updatePatternData(pattern.id, pattern);
    }
  }, [pattern, isLooping]);

  // Sync BPM
  useEffect(() => {
    setGlobalBpm(bpm);
    Tone.getTransport().bpm.value = bpm;
    Tone.getTransport().swing = swing / 100;
  }, [bpm, swing, setGlobalBpm]);

  const handleToggleLoop = useCallback(() => {
    if (!pattern) return;

    if (isLooping) {
      stopPattern(pattern.id);
    } else {
      startPattern(pattern.id, pattern, instrumentId, drumMachine);
    }
  }, [pattern, isLooping, startPattern, stopPattern, instrumentId, drumMachine]);

  const toggleStep = useCallback((padIndex: number, step: number) => {
    if (!pattern) return;

    const currentValue = pattern.grid[padIndex]?.[step] ?? false;
    updateDrumStep(pattern.id, padIndex, step, !currentValue);
    onPatternChange?.(pattern.grid);
  }, [pattern, updateDrumStep, onPatternChange]);

  const handleClear = useCallback(() => {
    if (pattern) {
      clearDrumPattern(pattern.id);
    }
  }, [pattern, clearDrumPattern]);

  const handleRandomize = useCallback(() => {
    if (pattern) {
      randomizeDrumPattern(pattern.id);
    }
  }, [pattern, randomizeDrumPattern]);

  const handlePatternChange = useCallback((newPatternId: string) => {
    setActivePattern(instrumentId, newPatternId);
  }, [instrumentId, setActivePattern]);

  if (!pattern) {
    return <div className="step-sequencer-loading">Loading...</div>;
  }

  const totalSteps = pattern.steps;
  const stepWidth = 30; // Width of each step cell
  const labelWidth = 40; // Width of the pad label column

  // Reorder pads to show kick/snare at top
  const padOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  return (
    <div className="step-sequencer">
      {/* Pattern Toolbar */}
      <PatternToolbar
        patternId={pattern.id}
        pattern={pattern}
        isLooping={isLooping}
        onToggleLoop={handleToggleLoop}
        onPatternChange={handlePatternChange}
      />

      <div className="sequencer-header">
        <div className="sequencer-controls">
          <button
            className={`btn ${isLooping ? 'btn--danger' : 'btn--primary'}`}
            onClick={handleToggleLoop}
          >
            {isLooping ? 'Stop' : 'Play'}
          </button>

          <div className="bpm-control">
            <label>BPM</label>
            <input
              type="number"
              min={60}
              max={200}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
            />
          </div>

          <div className="swing-control">
            <label>Swing</label>
            <input
              type="range"
              min={0}
              max={100}
              value={swing}
              onChange={(e) => setSwing(Number(e.target.value))}
            />
            <span>{swing}%</span>
          </div>
        </div>

        <div className="pattern-actions">
          <button className="btn btn--sm" onClick={handleClear}>Clear</button>
          <button className="btn btn--sm" onClick={handleRandomize}>Random</button>
        </div>
      </div>

      <div className="sequencer-grid-wrapper">
        <div className="sequencer-grid">
          {/* Step numbers header */}
          <div className="sequencer-row sequencer-header-row">
            <div className="sequencer-label"></div>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`sequencer-step-header ${
                  isLooping && currentStep % totalSteps === i ? 'active' : ''
                } ${i % 4 === 0 ? 'bar-start' : ''}`}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Pad rows */}
          {padOrder.slice(0, 8).map((padIndex) => (
            <div key={padIndex} className="sequencer-row">
              <div className="sequencer-label">{DRUM_PADS[padIndex].shortName}</div>
              {Array.from({ length: totalSteps }, (_, step) => (
                <div
                  key={step}
                  className={`sequencer-step ${
                    pattern.grid[padIndex]?.[step] ? 'active' : ''
                  } ${
                    isLooping && currentStep % totalSteps === step ? 'playing' : ''
                  } ${step % 4 === 0 ? 'bar-start' : ''}`}
                  onClick={() => toggleStep(padIndex, step)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Playhead overlay */}
        {isLooping && (
          <Playhead
            totalSteps={totalSteps}
            stepWidth={stepWidth}
            height={8 * 30 + 24}
            offsetLeft={labelWidth}
            isPlaying={isLooping}
          />
        )}
      </div>

      {/* Loop status indicator */}
      {activeLoopCount > 0 && (
        <div className="loop-status">
          <div className="loop-status-dot" />
          <span>{activeLoopCount} pattern{activeLoopCount > 1 ? 's' : ''} looping</span>
        </div>
      )}
    </div>
  );
}
