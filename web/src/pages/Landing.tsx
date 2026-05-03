import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { listEvents } from '../api/events';
import EventCard from '../components/EventCard';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { pushEvent } from '../hooks/useAnalytics';

export default function Landing() {
  const eventsRef = useRef<HTMLDivElement | null>(null);
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  const q = useQuery({ queryKey: ['events', 'landing'], queryFn: () => listEvents() });

  useEffect(() => {
    if (q.isError) toast.push('Could not load events', 'error');
  }, [q.isError, toast]);

  const onFind = (e: React.FormEvent) => {
    e.preventDefault();
    if (!venue && !date) {
      eventsRef.current?.scrollIntoView({ behavior: 'smooth' });
      pushEvent('search_submit', { venue, date, empty: true });
      return;
    }
    pushEvent('search_submit', { venue, date });
    const params = new URLSearchParams();
    if (venue) params.set('venue', venue);
    if (date) params.set('date', date);
    navigate(`/events?${params.toString()}`);
  };

  return (
    <>
      <Helmet>
        <title>EventPark — Park Before You Pack</title>
        <meta name="description" content="Reserve game-day parking from local hosts near your venue." />
        <link rel="canonical" href="/" />
      </Helmet>
      <section className="bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold">Park Before You Pack</h1>
          <p className="mt-2 text-lg opacity-90">Reserve a parking spot from a local host near your venue.</p>
          <form onSubmit={onFind} className="mt-6 max-w-xl mx-auto bg-white text-gray-900 rounded p-3 flex flex-col md:flex-row gap-2">
            <label className="sr-only" htmlFor="hero-venue">Venue</label>
            <input id="hero-venue" placeholder="Venue (e.g. Camp Randall)" value={venue} onChange={(e) => setVenue(e.target.value)} />
            <label className="sr-only" htmlFor="hero-date">Date</label>
            <input id="hero-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <button type="submit" className="btn-primary">Find Parking</button>
          </form>
          <div className="mt-4 flex justify-center gap-3">
            <Link to="/host/signup" className="btn-secondary">List Your Spots</Link>
          </div>
        </div>
      </section>

      <section ref={eventsRef} aria-labelledby="events-heading" className="max-w-7xl mx-auto px-4 py-10">
        <h2 id="events-heading" className="text-2xl font-bold mb-4">Upcoming events</h2>
        {q.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        ) : q.isError ? (
          <button type="button" className="btn-secondary" onClick={() => q.refetch()}>Retry</button>
        ) : (q.data ?? []).length === 0 ? (
          <EmptyState title="No upcoming events" message="Check back soon." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(q.data ?? []).slice(0, 3).map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="how-it-works" className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h2 id="how-it-works" className="text-2xl font-bold mb-4">How it works</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <li className="card p-4"><strong>1. Browse spots</strong><p>Find spots near your venue.</p></li>
            <li className="card p-4"><strong>2. Reserve</strong><p>Pay securely with a card.</p></li>
            <li className="card p-4"><strong>3. Park & enjoy</strong><p>Get directions and contact info.</p></li>
          </ol>
        </div>
      </section>
    </>
  );
}
