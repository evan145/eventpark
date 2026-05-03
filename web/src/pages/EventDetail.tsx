import { lazy, Suspense, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { getEvent, getEventSpots } from '../api/events';
import SpotCard from '../components/SpotCard';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Filters, { useFilters } from '../components/Filters';
import Breadcrumbs from '../components/Breadcrumbs';

const Map = lazy(() => import('../components/Map'));

export default function EventDetail() {
  const { id } = useParams();
  const eventId = Number(id);
  const { state } = useFilters();
  const [view, setView] = useState<'list' | 'map'>('list');

  const ev = useQuery({ queryKey: ['event', eventId], queryFn: () => getEvent(eventId), enabled: !Number.isNaN(eventId) });
  const spots = useQuery({
    queryKey: ['event-spots', eventId, state],
    queryFn: () =>
      getEventSpots(eventId, {
        sort: state.sort === 'price' || state.sort === 'distance' ? state.sort : undefined,
        max_price: state.max_price ? Number(state.max_price) : undefined,
        min_spots: state.min_spots ? Number(state.min_spots) : undefined,
        radius: state.radius ? Number(state.radius) : undefined,
      }),
    enabled: !Number.isNaN(eventId),
  });

  const sortedSpots = useMemo(() => {
    const arr = [...(spots.data ?? [])];
    if (state.sort === 'price_desc') arr.sort((a, b) => b.price_per_spot - a.price_per_spot);
    return arr;
  }, [spots.data, state.sort]);

  if (ev.isLoading) return <div className="p-6"><Skeleton className="h-32 w-full" /></div>;
  if (ev.isError || !ev.data) {
    return <div className="p-6"><button className="btn-secondary" onClick={() => ev.refetch()}>Retry</button></div>;
  }

  const e = ev.data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Helmet><title>{e.name} — EventPark</title></Helmet>
      <Breadcrumbs items={[{ label: 'Events', to: '/events' }, { label: e.name }]} />
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{e.name}</h1>
        <div className="text-gray-700">{e.venue_name}</div>
        <div className="text-gray-600 text-sm">{e.event_date} · {e.event_time}</div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.venue_address)}`}
          className="text-primary-600 underline text-sm"
          target="_blank"
          rel="noreferrer"
        >
          {e.venue_address}
        </a>
        <div className="mt-2 text-sm">
          <strong>{e.total_available_spots}</strong> spots available
        </div>
      </header>

      <Filters />

      <div className="my-3 flex justify-end">
        <div role="tablist" aria-label="View mode" className="inline-flex border border-gray-300 rounded">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'list'}
            className={`px-3 py-1 ${view === 'list' ? 'bg-primary-600 text-white' : ''}`}
            onClick={() => setView('list')}
            data-testid="view-list"
          >List</button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'map'}
            className={`px-3 py-1 ${view === 'map' ? 'bg-primary-600 text-white' : ''}`}
            onClick={() => setView('map')}
            data-testid="view-map"
          >Map</button>
        </div>
      </div>

      {spots.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" />
        </div>
      ) : spots.isError ? (
        <button type="button" className="btn-secondary" onClick={() => spots.refetch()}>Retry</button>
      ) : sortedSpots.length === 0 ? (
        <EmptyState title="No spots match your filters" />
      ) : view === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSpots.map((s) => <SpotCard key={s.event_listing_id} spot={s} eventId={eventId} />)}
        </div>
      ) : (
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Map spots={sortedSpots} venue={e} />
        </Suspense>
      )}
    </div>
  );
}
