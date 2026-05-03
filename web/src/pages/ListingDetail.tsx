import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { getListing } from '../api/listings';
import { getEventSpots } from '../api/events';
import RatingStars from '../components/RatingStars';
import Skeleton from '../components/Skeleton';
import BookingFlow from '../components/booking/BookingFlow';
import { pushEvent } from '../hooks/useAnalytics';

export default function ListingDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const listingId = Number(id);
  const eventId = params.get('event') ? Number(params.get('event')) : undefined;

  const lq = useQuery({ queryKey: ['listing', listingId, eventId], queryFn: () => getListing(listingId, eventId) });
  const sq = useQuery({
    queryKey: ['event-spots-for-listing', eventId],
    queryFn: () => getEventSpots(eventId!, {}),
    enabled: !!eventId,
  });

  useEffect(() => {
    if (lq.data) pushEvent('listing_view', { listing_id: lq.data.id });
  }, [lq.data]);

  if (lq.isLoading) return <div className="p-6"><Skeleton className="h-48 w-full" /></div>;
  if (lq.isError || !lq.data) {
    return <div className="p-6"><button className="btn-secondary" onClick={() => lq.refetch()}>Retry</button></div>;
  }
  const l = lq.data;
  const matching = (sq.data ?? []).find((s) => s.listing_id === l.id);
  const eventListingId = matching?.event_listing_id;
  const available = matching?.available_spots ?? l.number_of_spots;
  const unitPrice = matching?.price_per_spot ?? l.price_per_spot;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${l.latitude},${l.longitude}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 grid md:grid-cols-2 gap-6">
      <Helmet><title>{l.title} — EventPark</title></Helmet>
      <section>
        <h1 className="text-2xl font-bold">{l.title}</h1>
        <p className="text-gray-700">{l.address}</p>
        {l.distance_miles != null && <p className="text-sm text-gray-600">{l.distance_miles.toFixed(2)} miles from venue</p>}
        <p className="mt-2 text-lg">${l.price_per_spot.toFixed(2)} / spot</p>
        {l.host_rating != null && (
          <div className="flex items-center gap-2 mt-2">
            <RatingStars value={l.host_rating} />
            <span className="text-sm text-gray-600">({l.host_total_bookings} bookings)</span>
          </div>
        )}
        {l.description && <p className="mt-3 text-gray-800">{l.description}</p>}
        {l.photos && l.photos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2" data-testid="photo-gallery">
            {l.photos.map((p, i) => (
              <img key={i} src={p} alt={`Spot photo ${i + 1}`} className="rounded object-cover w-full h-32" loading="lazy" />
            ))}
          </div>
        )}
        <a className="btn-secondary mt-3 inline-block" href={directionsUrl} target="_blank" rel="noreferrer" data-testid="gps-link">
          Open in maps
        </a>
      </section>
      <aside>
        {eventListingId ? (
          <BookingFlow eventListingId={eventListingId} available={available} unitPrice={unitPrice} />
        ) : (
          <div className="card p-4">
            <p className="text-gray-700">Open this listing from an event page to book a spot.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
