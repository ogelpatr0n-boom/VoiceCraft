import { useAudioStore } from '../../stores/audio-store';
import { midiToNoteName, midiToOctave, midiToCents } from '../../audio/music-theory';

export function NoteDisplay() {
  const correctedMidi = useAudioStore(s => s.correctedMidi);
  const currentMidi = useAudioStore(s => s.currentMidi);
  const currentClarity = useAudioStore(s => s.currentClarity);

  const hasSignal = currentMidi > 0 && currentClarity > 0.5;
  const displayMidi = correctedMidi > 0 ? correctedMidi : currentMidi;
  const noteName = hasSignal ? midiToNoteName(displayMidi) : '--';
  const octave = hasSignal ? midiToOctave(displayMidi) : '';
  const cents = hasSignal ? midiToCents(currentMidi) : 0;

  let tuningClass = '';
  if (hasSignal) {
    if (Math.abs(cents) < 10) tuningClass = 'note-display--in-tune';
    else if (cents > 0) tuningClass = 'note-display--sharp';
    else tuningClass = 'note-display--flat';
  }

  return (
    <div className={`note-display ${tuningClass}`}>
      <div>
        <span className="note-display__note">{noteName}</span>
        <span className="note-display__octave">{octave}</span>
      </div>
      <span className="note-display__cents">
        {hasSignal ? `${cents > 0 ? '+' : ''}${cents.toFixed(0)} cents` : 'No signal'}
      </span>
    </div>
  );
}
