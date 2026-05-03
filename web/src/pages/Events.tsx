import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { listEvents } from '../api/events';
import EventCard from '../components/EventCard';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

export default function Events() {
  const [params, setParams] = useSearchParams();
  const venue = params.get('venue') ?? '';
  const dateStart = params.get('date_start') ?? '';
  const dateEnd = params.get('date_end') ?? '';
  const showPast = params.get('show_past') === '1';
  const q = useQuery({ queryKey: ['events', 'all'], queryFn: () => listEvents() });

  const filtered = useMemo(() => {
    let items = q.data ?? [];
    if (venue) items = items.filter((e) => e.venue_name.toLowerCase().includes(venue.toLowerCase()));
    if (dateStart) items = items.filter((e) => e.event_date >= dateStart);
    if (dateEnd) items = items.filter((e) => e.event_date <= dateEnd);
    if (!showPast) {
      const today = new Date().toISOString().slice(0, 10);
      items = items.filter((e) => e.event_date >= today);
    }
    return [...items].sort((a, b) => a.event_date.localeCompare(b.event_date));
  }, [q.data, venue, dateStart, dateEnd, showPast]);

  const setQ = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Helmet><title>Events — EventPark</title></Helmet>
      <h1 className="text-2xl font-bold mb-4">Upcoming events</h1>
      <section className="card p-4 mb-4 flex flex-wrap gap-3 items-end" aria-label="Filter events">
        <div>
          <label htmlFor="evt-venue">Venue</label>
          <input id="evt-venue" type="text" value={venue} onChange={(e) => setQ('venue', e.target.value)} />
        </div>
        <div>
          <label htmlFor="evt-start">From</label>
          <input id="evt-start" type="date" value={dateStart} onChange={(e) => setQ('date_start', e.target.value)} />
        </div>
        <div>
          <label htmlFor="evt-end">To</label>
          <input id="evt-end" type="date" value={dateEnd} onChange={(e) => setQ('date_end', e.target.value)} />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showPast}
            onChange={(e) => setQ('show_past', e.target.checked ? '1' : '')}
          />
          <span>Show past events</span>
        </label>
      </section>

      {q.isLoading ? (
        <Skeleton count={3} className="h-24 w-full" />
      ) : q.isError ? (
        <button type="button" className="btn-secondary" onClick={() => q.refetch()}>Retry</button>
      ) : filtered.length === 0 ? (
        <EmptyState title="No events match" message="Try clearing some filters." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ev) => <EventCard key={ev.id} event={ev} />)}
        </div>
      )}
    </div>
  );
}
