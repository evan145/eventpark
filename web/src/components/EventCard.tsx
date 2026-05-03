import { Link } from 'react-router-dom';
import type { EventSummary } from '../types';

interface Props {
  event: EventSummary;
  availableSpots?: number;
}

export default function EventCard({ event, availableSpots }: Props) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="card block p-4 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-primary-600"
      data-testid={`event-card-${event.id}`}
    >
      <div className="text-xs uppercase tracking-wide text-gray-500">{event.event_date}</div>
      <h3 className="font-semibold text-lg mt-1">{event.name}</h3>
      <div className="text-sm text-gray-700">{event.venue_name}</div>
      {availableSpots != null && (
        <div className="mt-2 text-sm text-primary-700">
          {availableSpots} spot{availableSpots === 1 ? '' : 's'} available
        </div>
      )}
    </Link>
  );
}
