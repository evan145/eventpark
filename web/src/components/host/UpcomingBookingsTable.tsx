import type { UpcomingHostBooking } from '../../types';
import EmptyState from '../EmptyState';

function firstName(full: string): string {
  return (full.split(' ')[0] || full).slice(0, 30);
}

export default function UpcomingBookingsTable({ rows }: { rows: UpcomingHostBooking[] }) {
  if (rows.length === 0) {
    return <EmptyState title="No upcoming bookings yet" message="When guests book your spots, they'll appear here." />;
  }
  return (
    <div data-testid="upcoming-bookings">
      <table className="w-full hidden md:table">
        <thead className="text-left text-sm text-gray-600">
          <tr>
            <th className="py-2">Confirmation</th>
            <th>Guest</th>
            <th>Spots</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-t border-gray-100">
              <td className="py-2 font-mono text-sm">{b.confirmation_code}</td>
              <td>{firstName(b.guest_name)}</td>
              <td>{b.spots_reserved}</td>
              <td>${b.total_price.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="md:hidden space-y-2">
        {rows.map((b) => (
          <li key={b.id} className="card p-3 text-sm">
            <div className="font-mono">{b.confirmation_code}</div>
            <div>{firstName(b.guest_name)} · {b.spots_reserved} spots · ${b.total_price.toFixed(2)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
