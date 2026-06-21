import { Knob } from '../controls/Knob';
import type { OscillatorType, FilterType, SynthParams } from '../../audio/instruments/synth';

interface SynthControlsProps {
  params: SynthParams;
  onOscillatorChange: (type: OscillatorType) => void;
  onFilterFreqChange: (freq: number) => void;
  onFilterTypeChange: (type: FilterType) => void;
  onAttackChange: (value: number) => void;
  onDecayChange: (value: number) => void;
  onSustainChange: (value: number) => void;
  onReleaseChange: (value: number) => void;
}

const OSC_TYPES: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'square'];
const FILTER_TYPES: FilterType[] = ['lowpass', 'highpass', 'bandpass'];

export function SynthControls({
  params,
  onOscillatorChange,
  onFilterFreqChange,
  onFilterTypeChange,
  onAttackChange,
  onDecayChange,
  onSustainChange,
  onReleaseChange,
}: SynthControlsProps) {
  return (
    <div className="synth-controls">
      {/* Oscillator Section */}
      <div className="synth-section">
        <div className="synth-section-header">Oscillator</div>
        <div className="synth-osc-buttons">
          {OSC_TYPES.map((type) => (
            <button
              key={type}
              className={`synth-osc-btn ${params.oscillator.type === type ? 'active' : ''}`}
              onClick={() => onOscillatorChange(type)}
            >
              <OscillatorIcon type={type} />
              <span>{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Section */}
      <div className="synth-section">
        <div className="synth-section-header">Filter</div>
        <div className="synth-filter-controls">
          <div className="synth-filter-type">
            {FILTER_TYPES.map((type) => (
              <button
                key={type}
                className={`synth-filter-btn ${params.filter.type === type ? 'active' : ''}`}
                onClick={() => onFilterTypeChange(type)}
              >
                {type.slice(0, 2).toUpperCase()}
              </button>
            ))}
          </div>
          <div className="synth-knob-group">
            <Knob
              value={params.filter.frequency}
              min={20}
              max={20000}
              onChange={onFilterFreqChange}
              label="Cutoff"
              size={50}
              logarithmic
            />
          </div>
        </div>
      </div>

      {/* Envelope Section */}
      <div className="synth-section">
        <div className="synth-section-header">Envelope (ADSR)</div>
        <div className="synth-envelope-knobs">
          <Knob
            value={params.envelope.attack}
            min={0.001}
            max={2}
            onChange={onAttackChange}
            label="Attack"
            size={50}
          />
          <Knob
            value={params.envelope.decay}
            min={0.001}
            max={2}
            onChange={onDecayChange}
            label="Decay"
            size={50}
          />
          <Knob
            value={params.envelope.sustain}
            min={0}
            max={1}
            onChange={onSustainChange}
            label="Sustain"
            size={50}
          />
          <Knob
            value={params.envelope.release}
            min={0.001}
            max={5}
            onChange={onReleaseChange}
            label="Release"
            size={50}
          />
        </div>
      </div>
    </div>
  );
}

// Simple SVG icons for oscillator types
function OscillatorIcon({ type }: { type: OscillatorType }) {
  const width = 24;
  const height = 16;

  switch (type) {
    case 'sine':
      return (
        <svg width={width} height={height} viewBox="0 0 24 16">
          <path
            d="M0 8 Q6 0, 12 8 Q18 16, 24 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={width} height={height} viewBox="0 0 24 16">
          <path
            d="M0 8 L6 2 L18 14 L24 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );
    case 'sawtooth':
      return (
        <svg width={width} height={height} viewBox="0 0 24 16">
          <path
            d="M0 14 L12 2 L12 14 L24 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );
    case 'square':
      return (
        <svg width={width} height={height} viewBox="0 0 24 16">
          <path
            d="M0 14 L0 2 L12 2 L12 14 L24 14 L24 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );
  }
}
