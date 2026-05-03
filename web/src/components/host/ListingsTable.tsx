import { Link } from 'react-router-dom';
import type { HostListing } from '../../types';

const badgeClass: Record<string, string> = {
  approved: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
  inactive: 'bg-gray-100 text-gray-700',
};

function badge(status: string) {
  const label = status === 'pending' ? 'Pending Approval' : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-block text-xs px-2 py-1 rounded ${badgeClass[status] ?? 'bg-gray-100 text-gray-700'}`} data-testid={`badge-${status}`}>
      {label}
    </span>
  );
}

export default function ListingsTable({ listings }: { listings: HostListing[] }) {
  return (
    <div data-testid="listings-table">
      <table className="w-full hidden md:table">
        <thead className="text-left text-sm text-gray-600">
          <tr>
            <th className="py-2">Title</th>
            <th>Address</th>
            <th>Spots</th>
            <th>Price</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <tr key={l.id} className="border-t border-gray-100">
              <td className="py-2">
                <Link to={`/host/listings/${l.id}/edit`} className="hover:underline">{l.title}</Link>
              </td>
              <td>{l.address}</td>
              <td>{l.number_of_spots}</td>
              <td>${l.price_per_spot.toFixed(2)}</td>
              <td>{badge(l.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="md:hidden space-y-2">
        {listings.map((l) => (
          <li key={l.id} className="card p-3">
            <Link to={`/host/listings/${l.id}/edit`} className="font-semibold">{l.title}</Link>
            <div className="text-sm text-gray-600">{l.address}</div>
            <div className="mt-1 flex justify-between text-sm">
              <span>${l.price_per_spot.toFixed(2)} · {l.number_of_spots} spots</span>
              {badge(l.status)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
