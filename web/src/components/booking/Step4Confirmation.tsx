import { useEffect } from 'react';
import type { Booking } from '../../types';
import { pushEvent } from '../../hooks/useAnalytics';

interface Props {
  booking: Booking;
}

function makeIcs(b: Booking): string {
  const dt = (b.created_at ?? new Date().toISOString()).replace(/[-:]/g, '').replace(/\.\d+/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventPark//EN',
    'BEGIN:VEVENT',
    `UID:${b.confirmation_code}@eventpark`,
    `DTSTAMP:${dt}`,
    `SUMMARY:EventPark booking ${b.confirmation_code}`,
    `LOCATION:${b.spot_address ?? ''}`,
    `DESCRIPTION:Confirmation ${b.confirmation_code}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export default function Step4Confirmation({ booking }: Props) {
  useEffect(() => {
    pushEvent('booking_completed', { booking_id: booking.id });
  }, [booking.id]);

  const downloadIcs = () => {
    const blob = new Blob([makeIcs(booking)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${booking.confirmation_code}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="step4-heading" data-testid="step-4" className="space-y-4">
      <h2 id="step4-heading" className="text-2xl font-bold">Booking confirmed!</h2>
      <p>
        Confirmation code:{' '}
        <span className="font-mono text-lg" data-testid="confirmation-code">{booking.confirmation_code}</span>
      </p>
      <div className="card p-4">
        <h3 className="font-semibold">Day-of contact</h3>
        <p>Host: {booking.host_name ?? 'TBD'}</p>
        <p>Phone: <a href={`tel:${booking.host_phone ?? ''}`}>{booking.host_phone ?? 'TBD'}</a></p>
      </div>
      {booking.directions_url && (
        <a
          className="btn-primary"
          href={booking.directions_url}
          target="_blank"
          rel="noreferrer"
          data-testid="gps-link"
        >
          Get directions
        </a>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={downloadIcs} data-testid="add-calendar">
          Add to calendar
        </button>
        <span role="status" aria-live="polite" className="text-sm text-green-700" data-testid="email-sent">
          A confirmation email is on its way
        </span>
      </div>
    </section>
  );
}
