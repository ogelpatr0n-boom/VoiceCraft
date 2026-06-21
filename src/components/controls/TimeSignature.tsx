import type { TimeSignature as TimeSignatureType } from '../../audio/timing/time-utils';

interface TimeSignatureProps {
  value: TimeSignatureType;
  onChange: (sig: TimeSignatureType) => void;
}

const TIME_SIGNATURES: TimeSignatureType[] = [
  { numerator: 4, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 6, denominator: 8 },
  { numerator: 2, denominator: 4 },
  { numerator: 5, denominator: 4 },
  { numerator: 7, denominator: 8 },
];

export function TimeSignatureControl({ value, onChange }: TimeSignatureProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [num, denom] = e.target.value.split('/').map(Number);
    onChange({ numerator: num, denominator: denom });
  };

  const currentValue = `${value.numerator}/${value.denominator}`;

  return (
    <div className="time-signature-control">
      <select
        className="time-signature-select"
        value={currentValue}
        onChange={handleChange}
      >
        {TIME_SIGNATURES.map((sig) => {
          const label = `${sig.numerator}/${sig.denominator}`;
          return (
            <option key={label} value={label}>
              {label}
            </option>
          );
        })}
      </select>
    </div>
  );
}
