import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { useInstrumentStore } from '../../stores/instrument-store';
import { usePatternStore, isMelodicPattern, type MelodicPattern } from '../../stores/pattern-store';
import { useLoopPlayback } from '../../hooks/useLoopPlayback';
import { InstrumentRack } from '../instruments/InstrumentRack';
import { OnScreenKeyboard } from '../instruments/OnScreenKeyboard';
import { DrumPads } from '../instruments/DrumPads';
import { StepSequencer } from '../instruments/StepSequencer';
import { SynthControls } from '../instruments/SynthControls';
import { PresetSelector } from '../instruments/PresetSelector';
import { PatternToolbar } from '../patterns/PatternToolbar';
import { InlinePianoRoll } from '../patterns/InlinePianoRoll';
import { LoopIndicator } from '../patterns/Playhead';
import type { SynthParams } from '../../audio/instruments/synth';
import { SynthInstrument, createSynth } from '../../audio/instruments/synth';
import { DrumMachine, createDrumMachine } from '../../audio/instruments/drum-machine';
import { SamplerInstrument, createSampler } from '../../audio/instruments/sampler';
import { BassSynth, createBassSynth } from '../../audio/instruments/bass-synth';
import { FMSynth, createFMSynth } from '../../audio/instruments/fm-synth';
import { Arpeggiator, createArpeggiator } from '../../audio/instruments/arpeggiator';
import {
  PluckedStringSynth,
  BowedStringSynth,
  PedalSteelSynth,
  createPluckedString,
  createBowedString,
  createPedalSteel,
} from '../../audio/instruments/string-instruments';
import { clipScheduler } from '../../audio/clips/clip-scheduler';
import { midiInput } from '../../audio/midi/midi-input';
import { Knob } from '../controls/Knob';
import { transport } from '../../audio/timing/transport';
import { createMidiNote } from '../../audio/midi/midi-event';

type InstrumentInstance =
  | SynthInstrument
  | DrumMachine
  | SamplerInstrument
  | BassSynth
  | FMSynth
  | Arpeggiator
  | PluckedStringSynth
  | BowedStringSynth
  | PedalSteelSynth;

export function InstrumentsView() {
  const instruments = useInstrumentStore((s) => s.instruments);
  const selectedId = useInstrumentStore((s) => s.selectedInstrumentId);
  const setSelectedId = useInstrumentStore((s) => s.setSelectedInstrumentId);
  const updateInstrument = useInstrumentStore((s) => s.updateInstrument);
  const getPreset = useInstrumentStore((s) => s.getPreset);
  const setInstrumentPreset = useInstrumentStore((s) => s.setInstrumentPreset);

  const {
    getActivePattern,
    createMelodicPattern,
    addNote,
    setActivePattern,
  } = usePatternStore();

  const {
    activeLoopCount,
    activePatternIds,
    startPattern,
    stopPattern,
    stopAll,
    isPatternLooping,
    registerInstrument,
    unregisterInstrument,
  } = useLoopPlayback();

  const [instances, setInstances] = useState<Map<string, InstrumentInstance>>(new Map());
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [midiConnected, setMidiConnected] = useState(false);
  const [showSequencer, setShowSequencerState] = useState(false); // Start with Pads mode

  // When switching to Pads mode, stop any running drum loops
  const setShowSequencer = useCallback((show: boolean) => {
    if (!show) {
      // Switching to Pads mode - stop any drum loops
      const loopingPatterns = usePatternStore.getState().getLoopingPatterns();
      loopingPatterns.forEach(p => {
        if (p.instrumentId === selectedId) {
          stopPattern(p.id);
        }
      });
    }
    setShowSequencerState(show);
  }, [selectedId, stopPattern]);
  const [showPianoRoll, setShowPianoRoll] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const initRef = useRef(false);
  const instancesRef = useRef<Map<string, InstrumentInstance>>(new Map());

  const selectedInstrument = instruments.find((i) => i.id === selectedId);
  const selectedInstance = selectedId ? instances.get(selectedId) : undefined;

  // Get melodic pattern for non-drum instruments
  const melodicPattern = selectedId && selectedInstrument?.type !== 'drums'
    ? getActivePattern(selectedId) as MelodicPattern | undefined
    : undefined;

  const isLooping = melodicPattern ? isPatternLooping(melodicPattern.id) : false;

  // Keep ref in sync
  useEffect(() => {
    instancesRef.current = instances;
  }, [instances]);

  // Initialize MIDI input
  useEffect(() => {
    const initMidi = async () => {
      const success = await midiInput.init();
      setMidiConnected(success && midiInput.isConnected());

      midiInput.setCallbacks({
        onNoteOn: (pitch, velocity) => {
          if (selectedInstance) {
            selectedInstance.triggerAttack(pitch, undefined, velocity);
            setActiveNotes((prev) => new Set(prev).add(pitch));
          }
        },
        onNoteOff: (pitch) => {
          if (selectedInstance) {
            selectedInstance.triggerRelease(pitch);
            setActiveNotes((prev) => {
              const next = new Set(prev);
              next.delete(pitch);
              return next;
            });
          }
        },
        onDeviceConnected: () => setMidiConnected(true),
        onDeviceDisconnected: () => setMidiConnected(midiInput.isConnected()),
      });
    };

    if (!initRef.current) {
      initRef.current = true;
      initMidi();
    }
  }, [selectedInstance]);

  // Create/destroy instrument instances
  useEffect(() => {
    const createInstances = async () => {
      const newInstances = new Map(instances);

      // Create instances for new instruments
      for (const data of instruments) {
        if (!newInstances.has(data.id)) {
          let instance: InstrumentInstance;

          try {
            switch (data.type) {
              case 'synth':
                instance = createSynth(data.name);
                break;
              case 'drums':
                instance = createDrumMachine(data.name);
                break;
              case 'sampler':
                instance = createSampler(data.name);
                break;
              case 'bass':
                instance = createBassSynth(data.name);
                break;
              case 'fm':
                instance = createFMSynth(data.name);
                break;
              case 'arpeggiator':
                instance = createArpeggiator(data.name);
                break;
              case 'plucked-string':
                instance = createPluckedString(data.name);
                break;
              case 'bowed-string':
                instance = createBowedString(data.name);
                break;
              case 'pedal-steel':
                instance = createPedalSteel(data.name);
                break;
              default:
                instance = createSynth(data.name);
            }

            instance.connect(Tone.getDestination());
            instance.setVolume(data.volume);
            instance.setMute(data.muted);

            // Load preset if set
            if (data.presetId) {
              const preset = getPreset(data.presetId);
              if (preset) {
                instance.loadPreset(preset.params);
              }
            }

            // Register with clip scheduler and loop engine
            clipScheduler.registerInstrument(data.id, instance);
            registerInstrument(data.id, instance);

            newInstances.set(data.id, instance);
          } catch (err) {
            console.warn('Failed to create instrument:', data.name, err);
          }
        }
      }

      // Remove instances for deleted instruments
      for (const [id, instance] of newInstances) {
        if (!instruments.find((i) => i.id === id)) {
          clipScheduler.unregisterInstrument(id);
          unregisterInstrument(id);
          instance.dispose();
          newInstances.delete(id);
        }
      }

      setInstances(newInstances);
    };

    createInstances();

    return () => {
      // Cleanup on unmount
      for (const instance of instances.values()) {
        instance.dispose();
      }
    };
  }, [instruments, getPreset, registerInstrument, unregisterInstrument]);

  // Create melodic pattern for non-drum instruments
  useEffect(() => {
    if (selectedId && selectedInstrument && selectedInstrument.type !== 'drums' && !melodicPattern) {
      createMelodicPattern(selectedId, 'Pattern 1');
    }
  }, [selectedId, selectedInstrument, melodicPattern, createMelodicPattern]);

  // Update instance settings when instrument data changes
  useEffect(() => {
    for (const data of instruments) {
      const instance = instances.get(data.id);
      if (instance) {
        instance.setVolume(data.volume);
        instance.setMute(data.muted);
      }
    }
  }, [instruments, instances]);

  // Track if audio has been initialized
  const audioInitialized = useRef(false);

  const initAudio = useCallback(async () => {
    if (!audioInitialized.current) {
      try {
        await Tone.start();
        if (Tone.getContext().state !== 'running') {
          await Tone.getContext().resume();
        }
        audioInitialized.current = true;
      } catch (e) {
        console.warn('Failed to initialize audio:', e);
      }
    }
  }, []);

  const handleNoteOn = useCallback(async (note: number, velocity: number) => {
    if (selectedInstance) {
      try {
        // Initialize audio on first interaction
        await initAudio();
        // Start transport for arpeggiator
        if (selectedInstance instanceof Arpeggiator) {
          await transport.play();
        }
        selectedInstance.triggerAttack(note, Tone.now(), velocity / 127);
        setActiveNotes((prev) => new Set(prev).add(note));

        // Record note if pattern exists and we're in record mode
        if (melodicPattern && showPianoRoll) {
          const midiNote = createMidiNote(note, 0, 0.25, velocity);
          addNote(melodicPattern.id, midiNote);
        }
      } catch (e) {
        console.warn('Failed to trigger note:', e);
      }
    }
  }, [selectedInstance, melodicPattern, showPianoRoll, addNote, initAudio]);

  const handleNoteOff = useCallback((note: number) => {
    if (selectedInstance) {
      try {
        selectedInstance.triggerRelease(note);
        setActiveNotes((prev) => {
          const next = new Set(prev);
          next.delete(note);
          return next;
        });
      } catch (e) {
        // Instance may have been disposed
      }
    }
  }, [selectedInstance]);

  const handleDrumPadHit = useCallback(async (padIndex: number, velocity: number) => {
    // First, make sure audio is initialized
    await initAudio();

    // Get the drum machine instance directly from the instances map
    const drumInstance = selectedId ? instances.get(selectedId) : undefined;

    if (drumInstance && 'triggerPad' in drumInstance) {
      try {
        // Directly trigger the pad - no async, no delays
        (drumInstance as DrumMachine).triggerPad(padIndex, Tone.now(), velocity / 127);
      } catch (e) {
        console.warn('Failed to trigger drum pad:', e);
      }
    } else {
      console.warn('No drum machine instance found for id:', selectedId);
    }
  }, [selectedId, instances, initAudio]);

  const handlePresetChange = useCallback((presetId: string) => {
    if (!selectedId || !selectedInstance) return;

    try {
      setInstrumentPreset(selectedId, presetId);
      const preset = getPreset(presetId);
      if (preset) {
        selectedInstance.loadPreset(preset.params);
      }
    } catch (e) {
      console.warn('Failed to load preset:', e);
    }
  }, [selectedId, selectedInstance, setInstrumentPreset, getPreset]);

  const handleVolumeChange = useCallback((value: number) => {
    if (selectedId) {
      updateInstrument(selectedId, { volume: value });
    }
  }, [selectedId, updateInstrument]);

  const handlePanChange = useCallback((value: number) => {
    if (selectedId) {
      updateInstrument(selectedId, { pan: value });
    }
  }, [selectedId, updateInstrument]);

  const handleToggleMelodicLoop = useCallback(() => {
    if (!melodicPattern || !selectedId || !selectedInstance) return;

    if (isLooping) {
      stopPattern(melodicPattern.id);
    } else {
      startPattern(melodicPattern.id, melodicPattern, selectedId);
    }
  }, [melodicPattern, selectedId, selectedInstance, isLooping, startPattern, stopPattern]);

  const handlePatternChange = useCallback((newPatternId: string) => {
    if (selectedId) {
      setActivePattern(selectedId, newPatternId);
    }
  }, [selectedId, setActivePattern]);

  const handleNotePreview = useCallback((pitch: number) => {
    if (selectedInstance && !(selectedInstance instanceof DrumMachine)) {
      selectedInstance.triggerAttackRelease(pitch, 0.2, Tone.now(), 0.7);
    }
  }, [selectedInstance]);

  return (
    <div className="instruments-view">
      <div className="instruments-sidebar">
        <InstrumentRack onInstrumentSelect={setSelectedId} />
        {midiConnected && (
          <div className="midi-status">
            <span className="midi-indicator active"></span>
            MIDI Connected
          </div>
        )}
        {/* Loop indicator */}
        <LoopIndicator loopCount={activeLoopCount} patternIds={activePatternIds} />
      </div>

      <div className="instruments-main">
        {!selectedInstrument ? (
          <div className="instruments-empty">
            <p>Select or create an instrument to get started</p>
          </div>
        ) : (
          <>
            <div className="instrument-header">
              <input
                type="text"
                className="instrument-name-input"
                value={selectedInstrument.name}
                onChange={(e) => updateInstrument(selectedInstrument.id, { name: e.target.value })}
              />
              <PresetSelector
                instrumentId={selectedInstrument.id}
                type={selectedInstrument.type}
                currentPresetId={selectedInstrument.presetId}
                onPresetChange={handlePresetChange}
              />
              <div className="instrument-master-controls">
                <Knob
                  value={selectedInstrument.volume}
                  min={-60}
                  max={12}
                  onChange={handleVolumeChange}
                  label="Volume"
                  size={40}
                  unit="dB"
                />
                <Knob
                  value={selectedInstrument.pan}
                  min={-1}
                  max={1}
                  onChange={handlePanChange}
                  label="Pan"
                  size={40}
                  bipolar
                />
              </div>
            </div>

            <div className="instrument-controls-area">
              {selectedInstrument.type === 'synth' && selectedInstance instanceof SynthInstrument && (() => {
                try {
                  const params = selectedInstance.getParams();
                  return (
                    <SynthControls
                      params={params}
                      onOscillatorChange={(type) => selectedInstance?.setOscillatorType(type)}
                      onFilterFreqChange={(freq) => selectedInstance?.setFilterFrequency(freq)}
                      onFilterTypeChange={(type) => selectedInstance?.setFilterType(type)}
                      onAttackChange={(v) => selectedInstance?.setAttack(v)}
                      onDecayChange={(v) => selectedInstance?.setDecay(v)}
                      onSustainChange={(v) => selectedInstance?.setSustain(v)}
                      onReleaseChange={(v) => selectedInstance?.setRelease(v)}
                    />
                  );
                } catch (e) {
                  return <p className="text-muted text-sm">Loading synth controls...</p>;
                }
              })()}

              {selectedInstrument.type === 'drums' && (
                <div className="drum-controls">
                  <div className="drum-mode-toggle">
                    <button
                      className={`btn btn--sm ${!showSequencer ? 'btn--primary' : ''}`}
                      onClick={() => setShowSequencer(false)}
                    >
                      Pads
                    </button>
                    <button
                      className={`btn btn--sm ${showSequencer ? 'btn--primary' : ''}`}
                      onClick={() => setShowSequencer(true)}
                    >
                      Sequencer
                    </button>
                    {activeLoopCount > 0 && (
                      <button
                        className="btn btn--sm btn--danger"
                        onClick={stopAll}
                        title="Stop all loops"
                      >
                        Stop All
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedInstrument.type === 'sampler' && (
                <div className="sampler-controls">
                  <p className="text-muted text-sm">Sampler instrument - play via keyboard</p>
                </div>
              )}

              {selectedInstrument.type === 'bass' && selectedInstance instanceof BassSynth && (() => {
                try {
                  const params = selectedInstance.getParams();
                  return (
                    <div className="bass-controls control-grid">
                      <div className="control-group">
                        <label>Oscillator</label>
                        <select
                          value={params.oscillator.type}
                          onChange={(e) => selectedInstance?.setOscillatorType(e.target.value as 'sawtooth' | 'square')}
                        >
                          <option value="sawtooth">Sawtooth</option>
                          <option value="square">Square</option>
                        </select>
                      </div>
                      <Knob
                        value={params.filter.frequency}
                        min={100}
                        max={5000}
                        onChange={(v) => selectedInstance?.setFilterFrequency(v)}
                        label="Cutoff"
                        size={50}
                        logarithmic
                      />
                      <Knob
                        value={params.filter.resonance}
                        min={0}
                        max={30}
                        onChange={(v) => selectedInstance?.setResonance(v)}
                        label="Resonance"
                        size={50}
                      />
                      <Knob
                        value={params.glide}
                        min={0}
                        max={0.5}
                        onChange={(v) => selectedInstance?.setGlide(v)}
                        label="Glide"
                        size={50}
                      />
                    </div>
                  );
                } catch (e) {
                  return <p className="text-muted text-sm">Loading bass controls...</p>;
                }
              })()}

              {selectedInstrument.type === 'fm' && selectedInstance instanceof FMSynth && (() => {
                try {
                  const params = selectedInstance.getParams();
                  return (
                    <div className="fm-controls control-grid">
                      <Knob
                        value={params.harmonicity}
                        min={0.5}
                        max={10}
                        onChange={(v) => selectedInstance?.setHarmonicity(v)}
                        label="Harmonicity"
                        size={50}
                      />
                      <Knob
                        value={params.modulationIndex}
                        min={0}
                        max={50}
                        onChange={(v) => selectedInstance?.setModulationIndex(v)}
                        label="Mod Index"
                        size={50}
                      />
                    </div>
                  );
                } catch (e) {
                  return <p className="text-muted text-sm">Loading FM controls...</p>;
                }
              })()}

              {selectedInstrument.type === 'arpeggiator' && selectedInstance instanceof Arpeggiator && (() => {
                try {
                  const params = selectedInstance.getParams();
                  return (
                    <div className="arp-controls control-grid">
                      <div className="control-group">
                        <label>Pattern</label>
                        <select
                          value={params.pattern}
                          onChange={(e) => selectedInstance?.setPattern(e.target.value as any)}
                        >
                          <option value="up">Up</option>
                          <option value="down">Down</option>
                          <option value="updown">Up/Down</option>
                          <option value="downup">Down/Up</option>
                          <option value="random">Random</option>
                        </select>
                      </div>
                      <div className="control-group">
                        <label>Division</label>
                        <select
                          value={params.division}
                          onChange={(e) => selectedInstance?.setDivision(e.target.value as any)}
                        >
                          <option value="4n">1/4</option>
                          <option value="8n">1/8</option>
                          <option value="16n">1/16</option>
                          <option value="32n">1/32</option>
                          <option value="8t">1/8 Triplet</option>
                          <option value="16t">1/16 Triplet</option>
                        </select>
                      </div>
                      <Knob
                        value={params.octaves}
                        min={1}
                        max={4}
                        onChange={(v) => selectedInstance?.setOctaves(Math.round(v))}
                        label="Octaves"
                        size={50}
                      />
                      <Knob
                        value={params.gate}
                        min={0.1}
                        max={1}
                        onChange={(v) => selectedInstance?.setGate(v)}
                        label="Gate"
                        size={50}
                      />
                    </div>
                  );
                } catch (e) {
                  return <p className="text-muted text-sm">Loading arpeggiator controls...</p>;
                }
              })()}

              {selectedInstrument.type === 'plucked-string' && selectedInstance instanceof PluckedStringSynth && (() => {
                try {
                  const params = selectedInstance.getParams();
                  return (
                    <div className="string-controls control-grid">
                      <div className="control-group">
                        <label>Instrument</label>
                        <select
                          value={params.instrument}
                          onChange={(e) => selectedInstance?.setInstrumentType(e.target.value as any)}
                        >
                          <option value="acoustic-guitar">Acoustic Guitar</option>
                          <option value="electric-guitar">Electric Guitar</option>
                          <option value="banjo">Banjo</option>
                          <option value="mandolin">Mandolin</option>
                          <option value="ukulele">Ukulele</option>
                          <option value="harp">Harp</option>
                        </select>
                      </div>
                      <Knob
                        value={params.resonance}
                        min={0.8}
                        max={0.99}
                        onChange={(v) => selectedInstance?.setResonance(v)}
                        label="Resonance"
                        size={50}
                      />
                      <Knob
                        value={params.dampening}
                        min={1000}
                        max={8000}
                        onChange={(v) => selectedInstance?.setDampening(v)}
                        label="Brightness"
                        size={50}
                        logarithmic
                      />
                    </div>
                  );
                } catch (e) {
                  return <p className="text-muted text-sm">Loading string controls...</p>;
                }
              })()}

              {selectedInstrument.type === 'bowed-string' && selectedInstance instanceof BowedStringSynth && (() => {
                try {
                  const params = selectedInstance.getParams();
                  return (
                    <div className="bowed-controls control-grid">
                      <Knob
                        value={params.vibrato.frequency}
                        min={2}
                        max={10}
                        onChange={(v) => selectedInstance?.setVibratoFrequency(v)}
                        label="Vibrato Rate"
                        size={50}
                      />
                      <Knob
                        value={params.vibrato.depth}
                        min={0}
                        max={0.3}
                        onChange={(v) => selectedInstance?.setVibratoDepth(v)}
                        label="Vibrato Depth"
                        size={50}
                      />
                    </div>
                  );
                } catch (e) {
                  return <p className="text-muted text-sm">Loading bowed string controls...</p>;
                }
              })()}

              {selectedInstrument.type === 'pedal-steel' && (
                <div className="pedal-steel-controls">
                  <p className="text-muted text-sm">Classic country pedal steel sound - play via keyboard</p>
                </div>
              )}
            </div>

            {/* Pattern toolbar for melodic instruments */}
            {selectedInstrument.type !== 'drums' && melodicPattern && (
              <div className="melodic-pattern-section">
                <div className="pattern-mode-toggle">
                  <button
                    className={`btn btn--sm ${!showPianoRoll ? 'btn--primary' : ''}`}
                    onClick={() => setShowPianoRoll(false)}
                  >
                    Keyboard
                  </button>
                  <button
                    className={`btn btn--sm ${showPianoRoll ? 'btn--primary' : ''}`}
                    onClick={() => setShowPianoRoll(true)}
                  >
                    Piano Roll
                  </button>
                </div>

                {showPianoRoll && (
                  <PatternToolbar
                    patternId={melodicPattern.id}
                    pattern={melodicPattern}
                    isLooping={isLooping}
                    onToggleLoop={handleToggleMelodicLoop}
                    onPatternChange={handlePatternChange}
                  />
                )}
              </div>
            )}

            <div className="instrument-player-area">
              {selectedInstrument.type === 'drums' ? (
                showSequencer && selectedInstance instanceof DrumMachine ? (
                  <StepSequencer
                    drumMachine={selectedInstance}
                    instrumentId={selectedInstrument.id}
                    steps={16}
                  />
                ) : (
                  <DrumPads onPadHit={handleDrumPadHit} />
                )
              ) : showPianoRoll && melodicPattern ? (
                <InlinePianoRoll
                  patternId={melodicPattern.id}
                  pattern={melodicPattern}
                  isLooping={isLooping}
                  onNotePreview={handleNotePreview}
                />
              ) : (
                <OnScreenKeyboard
                  onNoteOn={handleNoteOn}
                  onNoteOff={handleNoteOff}
                  activeNotes={activeNotes}
                  startOctave={2}
                  octaves={5}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
