import { useSearchParams } from 'react-router-dom';

export interface FilterState {
  sort: '' | 'price' | 'distance' | 'rating' | 'price_desc';
  max_price: string;
  min_spots: string;
  radius: string;
}

export function useFilters() {
  const [params, setParams] = useSearchParams();
  const state: FilterState = {
    sort: (params.get('sort') as FilterState['sort']) ?? '',
    max_price: params.get('max_price') ?? '',
    min_spots: params.get('min_spots') ?? '',
    radius: params.get('radius') ?? '',
  };
  const set = (patch: Partial<FilterState>) => {
    const next = new URLSearchParams(params);
    (Object.keys(patch) as Array<keyof FilterState>).forEach((k) => {
      const v = patch[k];
      if (v == null || v === '') next.delete(k);
      else next.set(k, String(v));
    });
    setParams(next, { replace: true });
  };
  const clear = () => {
    const next = new URLSearchParams(params);
    ['sort', 'max_price', 'min_spots', 'radius'].forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  };
  return { state, set, clear };
}

export default function Filters() {
  const { state, set, clear } = useFilters();
  return (
    <section
      aria-label="Filter spots"
      className="card p-4 flex flex-wrap gap-4 items-end"
      data-testid="filters"
    >
      <div>
        <label htmlFor="sort">Sort by</label>
        <select
          id="sort"
          value={state.sort}
          onChange={(e) => set({ sort: e.target.value as FilterState['sort'] })}
        >
          <option value="">Default</option>
          <option value="price">Price (low to high)</option>
          <option value="price_desc">Price (high to low)</option>
          <option value="distance">Distance</option>
          <option value="rating">Rating</option>
        </select>
      </div>
      <div>
        <label htmlFor="max_price">Max price ($)</label>
        <input
          id="max_price"
          type="range"
          min={0}
          max={100}
          step={5}
          value={state.max_price || 100}
          onChange={(e) => set({ max_price: e.target.value })}
        />
        <div className="text-xs text-gray-500">{state.max_price || '100'}</div>
      </div>
      <div>
        <label htmlFor="min_spots">Min spots</label>
        <input
          id="min_spots"
          type="number"
          min={1}
          value={state.min_spots}
          onChange={(e) => set({ min_spots: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="radius">Radius (mi)</label>
        <input
          id="radius"
          type="range"
          min={0.5}
          max={5}
          step={0.5}
          value={state.radius || 5}
          onChange={(e) => set({ radius: e.target.value })}
        />
        <div className="text-xs text-gray-500">{state.radius || '5'} mi</div>
      </div>
      <button type="button" className="btn-ghost" onClick={clear}>Clear filters</button>
    </section>
  );
}
