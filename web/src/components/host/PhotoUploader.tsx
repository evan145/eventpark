import { useState, type ChangeEvent } from 'react';

interface Props {
  onChange: (files: File[]) => void;
  max?: number;
  maxBytes?: number;
}

export default function PhotoUploader({ onChange, max = 5, maxBytes = 10 * 1024 * 1024 }: Props) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const fl = e.target.files;
    if (!fl) return;
    const list = Array.from(fl).slice(0, max);
    for (const f of list) {
      if (f.size > maxBytes) {
        setError(`${f.name} is larger than 10MB`);
        return;
      }
    }
    onChange(list);
    setPreviews(list.map((f) => URL.createObjectURL(f)));
  };

  return (
    <div>
      <label htmlFor="photos">Photos (up to {max})</label>
      <input
        id="photos"
        type="file"
        accept="image/*"
        multiple
        onChange={handle}
        aria-invalid={!!error}
        aria-describedby={error ? 'photos-err' : undefined}
      />
      {error && <p id="photos-err" role="alert" className="text-sm text-red-600 mt-1">{error}</p>}
      {previews.length > 0 && (
        <div className="mt-2 flex gap-2 flex-wrap" data-testid="photo-previews">
          {previews.map((src, i) => (
            <img key={i} src={src} alt={`Preview ${i + 1}`} className="h-20 w-20 object-cover rounded" />
          ))}
        </div>
      )}
    </div>
  );
}
