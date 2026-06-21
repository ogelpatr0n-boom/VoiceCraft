import { useEffectsStore } from '../../stores/effects-store';
import { Knob } from '../controls/Knob';

function EffectCard({ title, bypass, onToggle, children }: {
  title: string;
  bypass: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="effect-card" style={{ opacity: bypass ? 0.5 : 1 }}>
      <div className="effect-card__header">
        <span className="effect-card__title">{title}</span>
        <div className={`toggle ${!bypass ? 'toggle--on' : ''}`} onClick={onToggle}>
          <div className="toggle__thumb" />
        </div>
      </div>
      <div className="effect-card__knobs">
        {children}
      </div>
    </div>
  );
}

export function EffectsPanel() {
  const comp = useEffectsStore(s => s.compressor);
  const setComp = useEffectsStore(s => s.setCompressor);
  const eq = useEffectsStore(s => s.eq);
  const setEQ = useEffectsStore(s => s.setEQ);
  const chorus = useEffectsStore(s => s.chorus);
  const setChorus = useEffectsStore(s => s.setChorus);
  const delay = useEffectsStore(s => s.delay);
  const setDelay = useEffectsStore(s => s.setDelay);
  const reverb = useEffectsStore(s => s.reverb);
  const setReverb = useEffectsStore(s => s.setReverb);

  return (
    <div className="effects-panel">
      <EffectCard title="Compressor" bypass={comp.bypass} onToggle={() => setComp({ bypass: !comp.bypass })}>
        <Knob label="Threshold" value={comp.threshold} min={-60} max={0} step={1} unit="dB" onChange={v => setComp({ threshold: v })} />
        <Knob label="Ratio" value={comp.ratio} min={1} max={20} step={0.5} onChange={v => setComp({ ratio: v })} />
        <Knob label="Gain" value={comp.makeupGain} min={0} max={3} step={0.1} onChange={v => setComp({ makeupGain: v })} color="var(--accent-orange)" />
      </EffectCard>

      <EffectCard title="3-Band EQ" bypass={eq.bypass} onToggle={() => setEQ({ bypass: !eq.bypass })}>
        <Knob label="Low" value={eq.low} min={-12} max={12} step={0.5} unit="dB" onChange={v => setEQ({ low: v })} />
        <Knob label="Mid" value={eq.mid} min={-12} max={12} step={0.5} unit="dB" onChange={v => setEQ({ mid: v })} color="var(--accent-orange)" />
        <Knob label="High" value={eq.high} min={-12} max={12} step={0.5} unit="dB" onChange={v => setEQ({ high: v })} color="var(--accent-green)" />
      </EffectCard>

      <EffectCard title="Chorus" bypass={chorus.bypass} onToggle={() => setChorus({ bypass: !chorus.bypass })}>
        <Knob label="Rate" value={chorus.rate} min={0.1} max={5} step={0.1} unit="Hz" onChange={v => setChorus({ rate: v })} />
        <Knob label="Depth" value={chorus.depth} min={0} max={1} step={0.01} onChange={v => setChorus({ depth: v })} color="var(--accent-purple)" />
        <Knob label="Mix" value={chorus.mix} min={0} max={1} step={0.01} onChange={v => setChorus({ mix: v })} color="var(--accent-orange)" />
      </EffectCard>

      <EffectCard title="Delay" bypass={delay.bypass} onToggle={() => setDelay({ bypass: !delay.bypass })}>
        <Knob label="Time" value={delay.time} min={0.01} max={2} step={0.01} unit="s" onChange={v => setDelay({ time: v })} />
        <Knob label="Feedback" value={delay.feedback} min={0} max={0.95} step={0.01} onChange={v => setDelay({ feedback: v })} color="var(--accent-orange)" />
        <Knob label="Mix" value={delay.mix} min={0} max={1} step={0.01} onChange={v => setDelay({ mix: v })} color="var(--accent-green)" />
      </EffectCard>

      <EffectCard title="Reverb" bypass={reverb.bypass} onToggle={() => setReverb({ bypass: !reverb.bypass })}>
        <Knob label="Decay" value={reverb.decay} min={0.5} max={10} step={0.1} unit="s" onChange={v => setReverb({ decay: v })} />
        <Knob label="Mix" value={reverb.mix} min={0} max={1} step={0.01} onChange={v => setReverb({ mix: v })} color="var(--accent-orange)" />
      </EffectCard>
    </div>
  );
}
