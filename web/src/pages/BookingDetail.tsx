import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { getBooking, cancelBooking } from '../api/bookings';
import Skeleton from '../components/Skeleton';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import Step4Confirmation from '../components/booking/Step4Confirmation';

export default function BookingDetail() {
  const { id } = useParams();
  const bookingId = Number(id);
  const qc = useQueryClient();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  const q = useQuery({ queryKey: ['booking', bookingId], queryFn: () => getBooking(bookingId) });

  const m = useMutation({
    mutationFn: (email?: string) => cancelBooking(bookingId, email),
    onSuccess: (data) => {
      const pct = Math.round(data.refund_percent * 100);
      const label = pct === 100 ? 'Full refund issued' : pct === 50 ? '50% refund issued' : 'Cancelled (no refund)';
      toast.push(label, 'success');
      qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      setConfirming(false);
    },
    onError: () => toast.push('Could not cancel booking', 'error'),
  });

  if (q.isLoading) return <div className="p-6"><Skeleton className="h-32" /></div>;
  if (q.isError || !q.data) {
    return <div className="p-6"><button className="btn-secondary" onClick={() => q.refetch()}>Retry</button></div>;
  }
  const b = q.data;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Helmet><title>Booking {b.confirmation_code} — EventPark</title></Helmet>
      <Step4Confirmation booking={b} />
      <div className="mt-6 card p-4">
        <h3 className="font-semibold">Status</h3>
        <p data-testid="booking-status">{b.status}</p>
        {b.status === 'confirmed' && (
          <button type="button" className="btn-secondary mt-2" onClick={() => setConfirming(true)}>
            Cancel booking
          </button>
        )}
      </div>
      <Modal open={confirming} onClose={() => setConfirming(false)} title="Cancel this booking?">
        <p className="text-sm">Refund amount depends on how close to the event you cancel.</p>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>Keep booking</button>
          <button type="button" className="btn-primary" onClick={() => m.mutate(b.guest_email)} disabled={m.isPending}>
            Cancel booking
          </button>
        </div>
      </Modal>
    </div>
  );
}
