import { useEffect, useState } from 'react';

interface Suggestion {
  label: string;
  latitude: number;
  longitude: number;
}

const MOCK: Suggestion[] = [
  { label: '1234 Camp Randall Way, Madison, WI', latitude: 43.0696, longitude: -89.4126 },
  { label: '600 N Park St, Madison, WI', latitude: 43.0768, longitude: -89.4062 },
  { label: '1 Kohl Center Plaza, Madison, WI', latitude: 43.0712, longitude: -89.3989 },
];

interface Props {
  value: string;
  onSelect: (s: Suggestion) => void;
  onChange: (v: string) => void;
  id?: string;
  error?: string;
}

export default function AddressAutocomplete({ value, onSelect, onChange, id = 'address', error }: Props) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (value.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      setSuggestions(MOCK.filter((m) => m.label.toLowerCase().includes(value.toLowerCase())));
    }, 100);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="relative">
      <label htmlFor={id}>Address</label>
      <input
        id={id}
        type="text"
        autoComplete="street-address"
        value={value}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {error && <p id={`${id}-err`} role="alert" className="text-sm text-red-600 mt-1">{error}</p>}
      {open && suggestions.length > 0 && (
        <ul role="listbox" className="absolute z-10 w-full bg-white border border-gray-200 rounded mt-1 shadow">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
                onMouseDown={(e) => { e.preventDefault(); onSelect(s); setOpen(false); }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
