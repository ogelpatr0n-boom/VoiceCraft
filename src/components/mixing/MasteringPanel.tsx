import { useState, useEffect, useRef, useCallback } from 'react';
import { Knob } from '../controls/Knob';
import { VuMeter } from '../controls/VuMeter';
import { MasterBus, DEFAULT_MASTER_BUS_PARAMS, type MasterBusParams } from '../../audio/effects/master-bus';
import * as Tone from 'tone';

interface MasteringPanelProps {
  onParamsChange?: (params: MasterBusParams) => void;
}

export function MasteringPanel({ onParamsChange }: MasteringPanelProps) {
  const [params, setParams] = useState<MasterBusParams>(DEFAULT_MASTER_BUS_PARAMS);
  const [levels, setLevels] = useState({ left: 0, right: 0 });
  const [compReduction, setCompReduction] = useState(0);
  const [limiterReduction, setLimiterReduction] = useState(0);
  const [spectrumData, setSpectrumData] = useState<Float32Array | null>(null);

  const masterBusRef = useRef<MasterBus | null>(null);
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize master bus
  useEffect(() => {
    const ctx = Tone.getContext().rawContext;
    if (ctx && ctx instanceof AudioContext) {
      masterBusRef.current = new MasterBus(ctx, params);

      // Connect to main output
      masterBusRef.current.outputNode.connect(ctx.destination);
    }

    return () => {
      if (masterBusRef.current) {
        masterBusRef.current.dispose();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Update params
  const updateParams = useCallback((updates: Partial<MasterBusParams>) => {
    const newParams = { ...params, ...updates };
    setParams(newParams);
    if (masterBusRef.current) {
      masterBusRef.current.setParams(updates);
    }
    onParamsChange?.(newParams);
  }, [params, onParamsChange]);

  // Monitor levels
  useEffect(() => {
    const updateMeters = () => {
      if (masterBusRef.current) {
        const peakLevels = masterBusRef.current.getPeakLevels();
        setLevels(peakLevels);
        setCompReduction(masterBusRef.current.getCompressorReduction());
        setLimiterReduction(masterBusRef.current.getLimiterReduction());
        setSpectrumData(masterBusRef.current.getFrequencyData());
      }
      animationRef.current = requestAnimationFrame(updateMeters);
    };

    animationRef.current = requestAnimationFrame(updateMeters);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Draw spectrum analyzer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !spectrumData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#1e2a4a';
    ctx.fillRect(0, 0, width, height);

    // Draw spectrum
    const barCount = 64;
    const barWidth = width / barCount;
    const dataStep = Math.floor(spectrumData.length / barCount);

    ctx.fillStyle = '#00d4ff';
    for (let i = 0; i < barCount; i++) {
      const value = spectrumData[i * dataStep];
      // Convert dB to linear (value is in dB, typically -100 to 0)
      const normalizedValue = Math.max(0, (value + 100) / 100);
      const barHeight = normalizedValue * height;

      // Gradient based on frequency
      const hue = 180 + (i / barCount) * 60; // Cyan to blue
      ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
      ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
  }, [spectrumData]);

  return (
    <div className="mastering-panel">
      <div className="mastering-header">
        <h3>Master Bus</h3>
      </div>

      <div className="mastering-content">
        {/* Spectrum Analyzer */}
        <div className="mastering-section spectrum-section">
          <h4>Spectrum</h4>
          <canvas
            ref={canvasRef}
            width={300}
            height={80}
            className="spectrum-canvas"
          />
        </div>

        {/* Metering */}
        <div className="mastering-section metering-section">
          <h4>Output</h4>
          <div className="stereo-meters">
            <div className="meter-channel">
              <VuMeter level={levels.left} height={120} />
              <span>L</span>
            </div>
            <div className="meter-channel">
              <VuMeter level={levels.right} height={120} />
              <span>R</span>
            </div>
          </div>
          <div className="output-knob">
            <Knob
              label="Output"
              value={params.outputGain}
              min={0}
              max={2}
              step={0.01}
              onChange={(v) => updateParams({ outputGain: v })}
            />
          </div>
        </div>

        {/* EQ Section */}
        <div className="mastering-section">
          <div className="section-header">
            <h4>EQ</h4>
            <div
              className={`toggle ${!params.eqBypass ? 'toggle--on' : ''}`}
              onClick={() => updateParams({ eqBypass: !params.eqBypass })}
            >
              <div className="toggle__thumb" />
            </div>
          </div>
          <div className="knobs-row" style={{ opacity: params.eqBypass ? 0.5 : 1 }}>
            <Knob
              label="Low"
              value={params.eqLow}
              min={-12}
              max={12}
              step={0.5}
              unit="dB"
              onChange={(v) => updateParams({ eqLow: v })}
            />
            <Knob
              label="Mid"
              value={params.eqMid}
              min={-12}
              max={12}
              step={0.5}
              unit="dB"
              onChange={(v) => updateParams({ eqMid: v })}
              color="var(--accent-orange)"
            />
            <Knob
              label="High"
              value={params.eqHigh}
              min={-12}
              max={12}
              step={0.5}
              unit="dB"
              onChange={(v) => updateParams({ eqHigh: v })}
              color="var(--accent-green)"
            />
          </div>
        </div>

        {/* Compressor Section */}
        <div className="mastering-section">
          <div className="section-header">
            <h4>Compressor</h4>
            <div className="reduction-meter">
              <span>GR: {compReduction.toFixed(1)} dB</span>
            </div>
            <div
              className={`toggle ${!params.compBypass ? 'toggle--on' : ''}`}
              onClick={() => updateParams({ compBypass: !params.compBypass })}
            >
              <div className="toggle__thumb" />
            </div>
          </div>
          <div className="knobs-row" style={{ opacity: params.compBypass ? 0.5 : 1 }}>
            <Knob
              label="Threshold"
              value={params.compThreshold}
              min={-60}
              max={0}
              step={1}
              unit="dB"
              onChange={(v) => updateParams({ compThreshold: v })}
            />
            <Knob
              label="Ratio"
              value={params.compRatio}
              min={1}
              max={20}
              step={0.5}
              onChange={(v) => updateParams({ compRatio: v })}
              color="var(--accent-orange)"
            />
            <Knob
              label="Attack"
              value={params.compAttack * 1000}
              min={0.1}
              max={100}
              step={0.1}
              unit="ms"
              onChange={(v) => updateParams({ compAttack: v / 1000 })}
            />
            <Knob
              label="Release"
              value={params.compRelease * 1000}
              min={10}
              max={1000}
              step={10}
              unit="ms"
              onChange={(v) => updateParams({ compRelease: v / 1000 })}
            />
            <Knob
              label="Makeup"
              value={params.compMakeup}
              min={0}
              max={3}
              step={0.1}
              onChange={(v) => updateParams({ compMakeup: v })}
              color="var(--accent-green)"
            />
          </div>
        </div>

        {/* Limiter Section */}
        <div className="mastering-section">
          <div className="section-header">
            <h4>Limiter</h4>
            <div className="reduction-meter">
              <span>GR: {limiterReduction.toFixed(1)} dB</span>
            </div>
            <div
              className={`toggle ${!params.limiterBypass ? 'toggle--on' : ''}`}
              onClick={() => updateParams({ limiterBypass: !params.limiterBypass })}
            >
              <div className="toggle__thumb" />
            </div>
          </div>
          <div className="knobs-row" style={{ opacity: params.limiterBypass ? 0.5 : 1 }}>
            <Knob
              label="Input"
              value={params.limiterInputGain}
              min={0}
              max={4}
              step={0.1}
              onChange={(v) => updateParams({ limiterInputGain: v })}
            />
            <Knob
              label="Ceiling"
              value={params.limiterCeiling}
              min={-12}
              max={0}
              step={0.1}
              unit="dB"
              onChange={(v) => updateParams({ limiterCeiling: v })}
              color="var(--accent-red)"
            />
            <Knob
              label="Release"
              value={params.limiterRelease * 1000}
              min={10}
              max={500}
              step={10}
              unit="ms"
              onChange={(v) => updateParams({ limiterRelease: v / 1000 })}
            />
          </div>
        </div>

        {/* Presets */}
        <div className="mastering-section">
          <h4>Presets</h4>
          <div className="preset-buttons">
            <button
              className="preset-btn"
              onClick={() => updateParams({
                compThreshold: -18, compRatio: 3, compAttack: 0.01, compRelease: 0.2, compMakeup: 1,
                limiterCeiling: -0.3, limiterInputGain: 1,
              })}
            >
              Gentle
            </button>
            <button
              className="preset-btn"
              onClick={() => updateParams({
                compThreshold: -24, compRatio: 4, compAttack: 0.005, compRelease: 0.15, compMakeup: 1.2,
                limiterCeiling: -0.1, limiterInputGain: 1.5,
              })}
            >
              Punchy
            </button>
            <button
              className="preset-btn"
              onClick={() => updateParams({
                compThreshold: -30, compRatio: 6, compAttack: 0.001, compRelease: 0.1, compMakeup: 1.5,
                limiterCeiling: -0.1, limiterInputGain: 2,
              })}
            >
              Loud
            </button>
            <button
              className="preset-btn"
              onClick={() => updateParams({
                compThreshold: -12, compRatio: 2, compAttack: 0.02, compRelease: 0.3, compMakeup: 1,
                limiterCeiling: -0.5, limiterInputGain: 1,
              })}
            >
              Transparent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
