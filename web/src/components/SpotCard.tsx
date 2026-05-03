import { Link } from 'react-router-dom';
import type { SpotSummary } from '../types';
import RatingStars from './RatingStars';

interface Props {
  spot: SpotSummary;
  hostRating?: number | null;
  photo?: string | null;
  eventId?: number;
  onClick?: () => void;
}

export default function SpotCard({ spot, hostRating, photo, eventId, onClick }: Props) {
  const to = eventId ? `/listings/${spot.listing_id}?event=${eventId}` : `/listings/${spot.listing_id}`;
  return (
    <Link
      to={to}
      onClick={onClick}
      className="card block overflow-hidden hover:shadow-md transition"
      data-testid={`spot-card-${spot.listing_id}`}
    >
      {photo ? (
        <img src={photo} alt={`Photo of ${spot.title}`} loading="lazy" className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400" aria-hidden>
          No photo
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold">{spot.title}</h3>
        <div className="text-sm text-gray-600">{spot.address}</div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span data-testid="spot-price">${spot.price_per_spot.toFixed(2)}</span>
          <span data-testid="spot-distance">{spot.distance_miles.toFixed(2)} mi</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm text-gray-600">
          <span>{spot.available_spots} spot{spot.available_spots === 1 ? '' : 's'}</span>
          {hostRating != null && <RatingStars value={hostRating} />}
        </div>
      </div>
    </Link>
  );
}
