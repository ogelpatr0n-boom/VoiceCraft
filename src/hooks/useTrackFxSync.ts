// Watches instrument store and keeps trackFxEngine in sync with stored FX params.
import { useEffect } from 'react';
import { useInstrumentStore } from '../stores/instrument-store';
import { trackFxEngine } from '../audio/track-fx-engine';

export function useTrackFxSync() {
  const instruments = useInstrumentStore(s => s.instruments);

  useEffect(() => {
    for (const inst of instruments) {
      trackFxEngine.applyParams(inst.id, inst.fx, inst.volume, inst.pan, inst.muted);
    }
  }, [instruments]);
}
