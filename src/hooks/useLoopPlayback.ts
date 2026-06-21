import { useState, useEffect, useCallback, useRef } from 'react';
import { loopEngine } from '../audio/loops/loop-engine';
import { usePatternStore, type Pattern, isDrumPattern } from '../stores/pattern-store';

interface LoopPlaybackState {
  isRunning: boolean;
  currentBeat: number;
  currentBar: number;
  currentStep: number;
  activeLoopCount: number;
  activePatternIds: string[];
}

interface UseLoopPlaybackOptions {
  onBeat?: (beat: number, bar: number) => void;
  onBar?: (bar: number) => void;
  onStep?: (step: number) => void;
}

export function useLoopPlayback(options: UseLoopPlaybackOptions = {}) {
  const [state, setState] = useState<LoopPlaybackState>({
    isRunning: false,
    currentBeat: 0,
    currentBar: 0,
    currentStep: 0,
    activeLoopCount: 0,
    activePatternIds: [],
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const { setLooping, getLoopingPatterns } = usePatternStore();

  // Set up callbacks
  useEffect(() => {
    loopEngine.setCallbacks({
      onBeat: (beat, bar) => {
        setState(prev => ({ ...prev, currentBeat: beat, currentBar: bar }));
        optionsRef.current.onBeat?.(beat, bar);
      },
      onBar: (bar) => {
        optionsRef.current.onBar?.(bar);
      },
      onStep: (step) => {
        setState(prev => ({ ...prev, currentStep: step }));
        optionsRef.current.onStep?.(step);
      },
    });

    // Poll for state updates
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        isRunning: loopEngine.getIsRunning(),
        activeLoopCount: loopEngine.getActiveLoopCount(),
        activePatternIds: loopEngine.getActivePatternIds(),
        currentStep: loopEngine.getCurrentStep(),
      }));
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const startPattern = useCallback((
    patternId: string,
    pattern: Pattern,
    instrumentId: string,
    drumMachine?: any
  ) => {
    loopEngine.startPattern(patternId, pattern, instrumentId, drumMachine);
    setLooping(patternId, true);
    setState(prev => ({
      ...prev,
      isRunning: true,
      activeLoopCount: loopEngine.getActiveLoopCount(),
      activePatternIds: loopEngine.getActivePatternIds(),
    }));
  }, [setLooping]);

  const stopPattern = useCallback((patternId: string) => {
    loopEngine.stopPattern(patternId);
    setLooping(patternId, false);
    setState(prev => ({
      ...prev,
      isRunning: loopEngine.getIsRunning(),
      activeLoopCount: loopEngine.getActiveLoopCount(),
      activePatternIds: loopEngine.getActivePatternIds(),
    }));
  }, [setLooping]);

  const togglePattern = useCallback((
    patternId: string,
    pattern: Pattern,
    instrumentId: string,
    drumMachine?: any
  ) => {
    if (loopEngine.isLooping(patternId)) {
      stopPattern(patternId);
    } else {
      startPattern(patternId, pattern, instrumentId, drumMachine);
    }
  }, [startPattern, stopPattern]);

  const stopAll = useCallback(() => {
    const loopingPatterns = getLoopingPatterns();
    loopEngine.stopAll();
    // Update pattern store
    loopingPatterns.forEach(p => setLooping(p.id, false));
    setState(prev => ({
      ...prev,
      isRunning: false,
      currentBeat: 0,
      currentBar: 0,
      currentStep: 0,
      activeLoopCount: 0,
      activePatternIds: [],
    }));
  }, [setLooping, getLoopingPatterns]);

  const setBpm = useCallback((bpm: number) => {
    loopEngine.setBpm(bpm);
  }, []);

  const setLoopBars = useCallback((bars: number) => {
    loopEngine.setLoopBars(bars);
  }, []);

  const isPatternLooping = useCallback((patternId: string) => {
    return loopEngine.isLooping(patternId);
  }, []);

  const registerInstrument = useCallback((instrumentId: string, instrument: any) => {
    loopEngine.registerInstrument(instrumentId, instrument);
  }, []);

  const unregisterInstrument = useCallback((instrumentId: string) => {
    loopEngine.unregisterInstrument(instrumentId);
  }, []);

  return {
    ...state,
    startPattern,
    stopPattern,
    togglePattern,
    stopAll,
    setBpm,
    setLoopBars,
    isPatternLooping,
    registerInstrument,
    unregisterInstrument,
    getBpm: () => loopEngine.getBpm(),
  };
}
