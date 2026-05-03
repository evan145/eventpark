import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminCreateDispute } from '../../api/admin';
import { useToast } from '../Toast';

export default function DisputesTab() {
  const toast = useToast();
  const [bookingId, setBookingId] = useState('');
  const [resolution, setResolution] = useState('');
  const m = useMutation({
    mutationFn: adminCreateDispute,
    onSuccess: () => { toast.push('Dispute logged', 'success'); setBookingId(''); setResolution(''); },
    onError: () => toast.push('Could not log dispute', 'error'),
  });

  return (
    <div data-testid="disputes-tab">
      <h2 className="font-semibold mb-2">Open disputes</h2>
      <form
        className="card p-4 max-w-md space-y-3"
        onSubmit={(e) => { e.preventDefault(); m.mutate({ booking_id: Number(bookingId), resolution }); }}
      >
        <div>
          <label htmlFor="d-booking">Booking ID</label>
          <input id="d-booking" type="number" value={bookingId} onChange={(e) => setBookingId(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="d-resolution">Resolution</label>
          <textarea id="d-resolution" value={resolution} onChange={(e) => setResolution(e.target.value)} required rows={3} />
        </div>
        <button type="submit" className="btn-primary" disabled={m.isPending}>Resolve</button>
      </form>
    </div>
  );
}
