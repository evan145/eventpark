import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyListing, updateListing, deleteListing } from '../api/host';
import Skeleton from '../components/Skeleton';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { ApiError } from '../api/client';
import Breadcrumbs from '../components/Breadcrumbs';

export default function HostListingEdit() {
  const { id } = useParams();
  const listingId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [vals, setVals] = useState({ title: '', description: '', address: '', number_of_spots: 1, price_per_spot: 1 });

  const q = useQuery({ queryKey: ['host', 'listing', listingId], queryFn: () => getMyListing(listingId) });

  useEffect(() => {
    if (q.data) {
      setVals({
        title: q.data.title,
        description: q.data.description ?? '',
        address: q.data.address,
        number_of_spots: q.data.number_of_spots,
        price_per_spot: q.data.price_per_spot,
      });
    }
  }, [q.data]);

  const m = useMutation({
    mutationFn: () => updateListing(listingId, vals),
    onSuccess: () => {
      toast.push('Listing updated', 'success');
      qc.invalidateQueries({ queryKey: ['host', 'listing', listingId] });
    },
    onError: () => toast.push('Could not update listing', 'error'),
  });

  const del = useMutation({
    mutationFn: () => deleteListing(listingId),
    onSuccess: () => {
      toast.push('Listing deleted', 'success');
      qc.invalidateQueries({ queryKey: ['host', 'listings'] });
      navigate('/host/dashboard');
    },
    onError: () => toast.push('Could not delete listing', 'error'),
  });

  if (q.isLoading) return <div className="p-6"><Skeleton className="h-32" /></div>;
  if (q.isError) {
    const status = (q.error as ApiError | undefined)?.status;
    if (status === 403 || status === 404) {
      return (
        <div className="p-8 max-w-2xl mx-auto" role="alert">
          <h1 className="text-2xl font-bold mb-2">{status === 403 ? '403 — Not your listing' : '404 — Listing not found'}</h1>
        </div>
      );
    }
    return <button className="btn-secondary" onClick={() => q.refetch()}>Retry</button>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Helmet><title>Edit listing — EventPark</title></Helmet>
      <Breadcrumbs items={[{ label: 'Host', to: '/host/dashboard' }, { label: 'Edit listing' }]} />
      <h1 className="text-2xl font-bold mb-4">Edit listing</h1>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <div>
          <label htmlFor="ed-title">Title</label>
          <input id="ed-title" value={vals.title} onChange={(e) => setVals({ ...vals, title: e.target.value })} />
        </div>
        <div>
          <label htmlFor="ed-desc">Description</label>
          <textarea id="ed-desc" rows={3} value={vals.description} onChange={(e) => setVals({ ...vals, description: e.target.value })} />
        </div>
        <div>
          <label htmlFor="ed-address">Address</label>
          <input id="ed-address" value={vals.address} onChange={(e) => setVals({ ...vals, address: e.target.value })} />
        </div>
        <div className="flex gap-3">
          <div>
            <label htmlFor="ed-spots">Spots</label>
            <input id="ed-spots" type="number" min={1} value={vals.number_of_spots}
              onChange={(e) => setVals({ ...vals, number_of_spots: Number(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="ed-price">Price</label>
            <input id="ed-price" type="number" step="0.01" min={0.01} value={vals.price_per_spot}
              onChange={(e) => setVals({ ...vals, price_per_spot: Number(e.target.value) })} />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={m.isPending}>Save</button>
          <button type="button" className="btn-secondary" onClick={() => setConfirming(true)}>Delete</button>
        </div>
      </form>
      <Modal open={confirming} onClose={() => setConfirming(false)} title="Delete this listing?">
        <p>This will mark the listing inactive.</p>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => del.mutate()} disabled={del.isPending}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}
