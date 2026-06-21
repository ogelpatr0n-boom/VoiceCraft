import type { InstrumentType } from '../../stores/instrument-store';
import { useInstrumentStore } from '../../stores/instrument-store';

interface PresetSelectorProps {
  instrumentId: string;
  type: InstrumentType;
  currentPresetId: string | null;
  onPresetChange: (presetId: string) => void;
}

export function PresetSelector({
  instrumentId,
  type,
  currentPresetId,
  onPresetChange,
}: PresetSelectorProps) {
  const getPresetsForType = useInstrumentStore((s) => s.getPresetsForType);
  const presets = getPresetsForType(type);

  return (
    <div className="preset-selector">
      <label className="preset-label">Preset</label>
      <select
        className="preset-dropdown"
        value={currentPresetId || ''}
        onChange={(e) => onPresetChange(e.target.value)}
      >
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
    </div>
  );
}
