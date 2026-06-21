import type { InstrumentType, InstrumentData } from '../../stores/instrument-store';
import { useInstrumentStore } from '../../stores/instrument-store';

interface InstrumentRackProps {
  onInstrumentSelect: (id: string) => void;
}

export function InstrumentRack({ onInstrumentSelect }: InstrumentRackProps) {
  const instruments = useInstrumentStore((s) => s.instruments);
  const selectedId = useInstrumentStore((s) => s.selectedInstrumentId);
  const addInstrument = useInstrumentStore((s) => s.addInstrument);
  const removeInstrument = useInstrumentStore((s) => s.removeInstrument);
  const updateInstrument = useInstrumentStore((s) => s.updateInstrument);

  const handleAddInstrument = (type: InstrumentType) => {
    const id = addInstrument(type);
    onInstrumentSelect(id);
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeInstrument(id);
  };

  const handleMuteToggle = (instrument: InstrumentData, e: React.MouseEvent) => {
    e.stopPropagation();
    updateInstrument(instrument.id, { muted: !instrument.muted });
  };

  const handleSoloToggle = (instrument: InstrumentData, e: React.MouseEvent) => {
    e.stopPropagation();
    updateInstrument(instrument.id, { solo: !instrument.solo });
  };

  const getTypeIcon = (type: InstrumentType) => {
    switch (type) {
      case 'synth': return '🎹';
      case 'drums': return '🥁';
      case 'sampler': return '🎼';
      case 'bass': return '🎸';
      case 'fm': return '🔊';
      case 'arpeggiator': return '🎵';
      case 'plucked-string': return '🪕';
      case 'bowed-string': return '🎻';
      case 'pedal-steel': return '🎶';
      default: return '🎵';
    }
  };

  return (
    <div className="instrument-rack">
      <div className="instrument-rack-header">
        <span>Instruments</span>
      </div>

      <div className="instrument-categories">
        <div className="instrument-category">
          <div className="category-label">Electronic / DJ</div>
          <div className="category-buttons">
            <button className="btn btn-sm" onClick={() => handleAddInstrument('synth')} title="Polyphonic Synthesizer">
              🎹 Synth
            </button>
            <button className="btn btn-sm" onClick={() => handleAddInstrument('bass')} title="TB-303 Style Bass">
              🎸 Bass
            </button>
            <button className="btn btn-sm" onClick={() => handleAddInstrument('fm')} title="FM Synthesis (DX7)">
              🔊 FM
            </button>
            <button className="btn btn-sm" onClick={() => handleAddInstrument('drums')} title="Drum Machine">
              🥁 Drums
            </button>
            <button className="btn btn-sm" onClick={() => handleAddInstrument('arpeggiator')} title="Arpeggiator">
              🎵 Arp
            </button>
          </div>
        </div>

        <div className="instrument-category">
          <div className="category-label">Country / Acoustic</div>
          <div className="category-buttons">
            <button className="btn btn-sm" onClick={() => handleAddInstrument('plucked-string')} title="Guitar, Banjo, Mandolin">
              🪕 Guitar
            </button>
            <button className="btn btn-sm" onClick={() => handleAddInstrument('bowed-string')} title="Fiddle, Violin">
              🎻 Fiddle
            </button>
            <button className="btn btn-sm" onClick={() => handleAddInstrument('pedal-steel')} title="Pedal Steel Guitar">
              🎶 Steel
            </button>
          </div>
        </div>

        <div className="instrument-category">
          <div className="category-label">Samples</div>
          <div className="category-buttons">
            <button className="btn btn-sm" onClick={() => handleAddInstrument('sampler')} title="Sample-based Instruments">
              🎼 Sampler
            </button>
          </div>
        </div>
      </div>

      <div className="instrument-rack-list">
        {instruments.length === 0 ? (
          <div className="instrument-rack-empty">
            No instruments. Add one above.
          </div>
        ) : (
          instruments.map((instrument) => (
            <div
              key={instrument.id}
              className={`instrument-rack-item ${selectedId === instrument.id ? 'selected' : ''}`}
              onClick={() => onInstrumentSelect(instrument.id)}
            >
              <span className="instrument-icon">{getTypeIcon(instrument.type)}</span>
              <span className="instrument-name">{instrument.name}</span>
              <div className="instrument-controls">
                <button
                  className={`btn btn-icon btn-xs ${instrument.muted ? 'active' : ''}`}
                  onClick={(e) => handleMuteToggle(instrument, e)}
                  title="Mute"
                >
                  M
                </button>
                <button
                  className={`btn btn-icon btn-xs ${instrument.solo ? 'active' : ''}`}
                  onClick={(e) => handleSoloToggle(instrument, e)}
                  title="Solo"
                >
                  S
                </button>
                <button
                  className="btn btn-icon btn-xs btn-danger"
                  onClick={(e) => handleRemove(instrument.id, e)}
                  title="Remove"
                >
                  X
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
