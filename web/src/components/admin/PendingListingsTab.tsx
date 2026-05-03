import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminListings, adminUpdateListingStatus } from '../../api/admin';
import Modal from '../Modal';
import EmptyState from '../EmptyState';
import Skeleton from '../Skeleton';
import { useToast } from '../Toast';

export default function PendingListingsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  const q = useQuery({
    queryKey: ['admin', 'listings', 'pending'],
    queryFn: () => adminListings('pending'),
  });

  const m = useMutation({
    mutationFn: ({ id, status, reason }: { id: number; status: 'approved' | 'rejected'; reason?: string }) =>
      adminUpdateListingStatus(id, status, reason),
    onSuccess: (_d, vars) => {
      toast.push(vars.status === 'approved' ? 'Listing approved' : 'Listing rejected', 'success');
      qc.invalidateQueries({ queryKey: ['admin', 'listings', 'pending'] });
    },
    onError: () => toast.push('Could not update listing', 'error'),
  });

  if (q.isLoading) return <Skeleton count={3} className="h-12 w-full" />;
  if (q.isError) return <button className="btn-secondary" onClick={() => q.refetch()}>Retry</button>;
  const items = q.data ?? [];
  if (items.length === 0) return <EmptyState title="No pending listings" />;

  return (
    <div data-testid="pending-listings">
      <table className="w-full">
        <thead className="text-left text-sm text-gray-600">
          <tr><th>Title</th><th>Address</th><th>Spots</th><th>Price</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {items.map((l) => (
            <tr key={l.id} className="border-t border-gray-100">
              <td className="py-2">{l.title}</td>
              <td>{l.address}</td>
              <td>{l.number_of_spots}</td>
              <td>${l.price_per_spot.toFixed(2)}</td>
              <td>
                <button
                  type="button"
                  className="btn-primary mr-2"
                  onClick={() => m.mutate({ id: l.id, status: 'approved' })}
                  data-testid={`approve-${l.id}`}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setRejecting(l.id); setReason(''); }}
                  data-testid={`reject-${l.id}`}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={rejecting !== null} onClose={() => setRejecting(null)} title="Reject listing">
        <label htmlFor="reject-reason">Reason</label>
        <textarea id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        <div className="mt-3 flex gap-2 justify-end">
          <button type="button" className="btn-ghost" onClick={() => setRejecting(null)}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            disabled={!reason}
            onClick={() => {
              if (rejecting != null) {
                m.mutate({ id: rejecting, status: 'rejected', reason });
                setRejecting(null);
              }
            }}
          >
            Reject listing
          </button>
        </div>
      </Modal>
    </div>
  );
}
