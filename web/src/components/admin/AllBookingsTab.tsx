import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminBookings } from '../../api/admin';
import Skeleton from '../Skeleton';
import EmptyState from '../EmptyState';

const PAGE = 10;

export default function AllBookingsTab() {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['admin', 'bookings'], queryFn: adminBookings });
  const items = q.data ?? [];
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const slice = useMemo(() => items.slice((page - 1) * PAGE, page * PAGE), [items, page]);

  if (q.isLoading) return <Skeleton count={3} className="h-12 w-full" />;
  if (q.isError) return <button className="btn-secondary" onClick={() => q.refetch()}>Retry</button>;
  if (items.length === 0) return <EmptyState title="No bookings yet" />;

  return (
    <div data-testid="all-bookings">
      <table className="w-full">
        <thead className="text-left text-sm text-gray-600">
          <tr><th>Confirmation</th><th>Guest</th><th>Spots</th><th>Total</th><th>Status</th></tr>
        </thead>
        <tbody>
          {slice.map((b) => (
            <tr key={b.id} className="border-t border-gray-100">
              <td className="py-2 font-mono text-sm">{b.confirmation_code}</td>
              <td>{b.guest_name}</td>
              <td>{b.spots_reserved}</td>
              <td>${b.total_price.toFixed(2)}</td>
              <td>{b.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <nav aria-label="Pagination" className="mt-3 flex gap-2 items-center">
        <button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button type="button" className="btn-ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </nav>
    </div>
  );
}
