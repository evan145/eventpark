import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Stepper from '../Stepper';
import AddressAutocomplete from './AddressAutocomplete';
import PhotoUploader from './PhotoUploader';
import { createListing } from '../../api/host';
import { listEvents } from '../../api/events';
import { useToast } from '../Toast';
import type { HostListing } from '../../types';

interface State {
  address: string;
  latitude?: number;
  longitude?: number;
  title: string;
  description: string;
  number_of_spots: number;
  price_per_spot: number;
  photos: File[];
  selectedEventIds: number[];
}

export default function ListingWizard() {
  const [step, setStep] = useState(1);
  const [s, setS] = useState<State>({
    address: '',
    title: '',
    description: '',
    number_of_spots: 1,
    price_per_spot: 10,
    photos: [],
    selectedEventIds: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const toast = useToast();

  const eventsQ = useQuery({ queryKey: ['events'], queryFn: () => listEvents() });

  const m = useMutation({
    mutationFn: (payload: Parameters<typeof createListing>[0]) => createListing(payload),
    onSuccess: (l: HostListing) => {
      toast.push('Listing created — pending approval', 'success');
      navigate('/host/dashboard', { state: { newListingId: l.id } });
    },
    onError: () => toast.push('Could not create listing', 'error'),
  });

  const next = () => {
    const errs: Record<string, string> = {};
    if (step === 1 && !s.address) errs.address = 'Address is required';
    if (step === 2) {
      if (s.number_of_spots < 1) errs.number_of_spots = 'Must be at least 1';
      if (s.price_per_spot <= 0) errs.price_per_spot = 'Must be greater than 0';
      if (!s.title) errs.title = 'Title is required';
    }
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep((x) => Math.min(5, x + 1));
  };

  const back = () => setStep((x) => Math.max(1, x - 1));

  const submit = () => {
    m.mutate({
      title: s.title,
      description: s.description,
      number_of_spots: s.number_of_spots,
      price_per_spot: s.price_per_spot,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
    });
  };

  return (
    <div className="space-y-6" data-testid="listing-wizard">
      <Stepper steps={['Address', 'Spots & price', 'Photos', 'Events', 'Review']} current={step} />

      {step === 1 && (
        <section data-testid="wizard-step-1">
          <AddressAutocomplete
            value={s.address}
            onChange={(v) => setS({ ...s, address: v })}
            onSelect={(sug) => setS({ ...s, address: sug.label, latitude: sug.latitude, longitude: sug.longitude })}
            error={errors.address}
          />
        </section>
      )}

      {step === 2 && (
        <section data-testid="wizard-step-2" className="space-y-3">
          <div>
            <label htmlFor="title">Title</label>
            <input
              id="title"
              value={s.title}
              aria-invalid={!!errors.title}
              onChange={(e) => setS({ ...s, title: e.target.value })}
            />
            {errors.title && <p role="alert" className="text-sm text-red-600">{errors.title}</p>}
          </div>
          <div>
            <label htmlFor="description">Description</label>
            <textarea id="description" rows={3} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <div>
              <label htmlFor="spots">Number of spots</label>
              <input
                id="spots"
                type="number"
                min={1}
                value={s.number_of_spots}
                aria-invalid={!!errors.number_of_spots}
                onChange={(e) => setS({ ...s, number_of_spots: Math.max(1, Number(e.target.value) || 1) })}
              />
              {errors.number_of_spots && <p role="alert" className="text-sm text-red-600">{errors.number_of_spots}</p>}
            </div>
            <div>
              <label htmlFor="price">Price per spot ($)</label>
              <input
                id="price"
                type="number"
                step="0.01"
                min={0.01}
                value={s.price_per_spot}
                aria-invalid={!!errors.price_per_spot}
                onChange={(e) => setS({ ...s, price_per_spot: Number(e.target.value) || 0 })}
              />
              {errors.price_per_spot && <p role="alert" className="text-sm text-red-600">{errors.price_per_spot}</p>}
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <section data-testid="wizard-step-3">
          <PhotoUploader onChange={(files) => setS({ ...s, photos: files })} />
        </section>
      )}

      {step === 4 && (
        <section data-testid="wizard-step-4">
          <h2 className="font-semibold">Pick events</h2>
          <ul className="mt-2 space-y-1">
            {(eventsQ.data ?? []).map((ev) => (
              <li key={ev.id}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.selectedEventIds.includes(ev.id)}
                    onChange={(e) =>
                      setS({
                        ...s,
                        selectedEventIds: e.target.checked
                          ? [...s.selectedEventIds, ev.id]
                          : s.selectedEventIds.filter((id) => id !== ev.id),
                      })
                    }
                  />
                  <span>{ev.name} — {ev.event_date}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === 5 && (
        <section data-testid="wizard-step-5" className="card p-4 space-y-2">
          <h2 className="font-semibold">Review</h2>
          <p><strong>Title:</strong> {s.title}</p>
          <p><strong>Address:</strong> {s.address}</p>
          <p><strong>Spots:</strong> {s.number_of_spots}</p>
          <p><strong>Price:</strong> ${s.price_per_spot.toFixed(2)}</p>
          <p><strong>Photos:</strong> {s.photos.length}</p>
          <p><strong>Events:</strong> {s.selectedEventIds.length}</p>
        </section>
      )}

      <div className="flex gap-2">
        {step > 1 && <button type="button" className="btn-ghost" onClick={back}>Back</button>}
        {step < 5 && <button type="button" className="btn-primary" onClick={next}>Continue</button>}
        {step === 5 && <button type="button" className="btn-primary" disabled={m.isPending} onClick={submit}>Submit listing</button>}
      </div>
    </div>
  );
}
