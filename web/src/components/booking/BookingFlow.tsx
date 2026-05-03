import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import Stepper from '../Stepper';
import Step1SelectSpots from './Step1SelectSpots';
import Step2Contact, { type ContactValues } from './Step2Contact';
import Step3Payment from './Step3Payment';
import Step4Confirmation from './Step4Confirmation';
import { createBooking } from '../../api/bookings';
import { ApiError } from '../../api/client';
import { useToast } from '../Toast';
import type { Booking } from '../../types';
import { pushEvent } from '../../hooks/useAnalytics';

interface Props {
  eventListingId: number;
  available: number;
  unitPrice: number;
}

export default function BookingFlow({ eventListingId, available, unitPrice }: Props) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const stepFromUrl = Math.max(1, Math.min(4, Number(params.get('step') ?? 1) || 1));
  const [step, setStep] = useState(stepFromUrl);
  const [spots, setSpots] = useState(1);
  const [contact, setContact] = useState<ContactValues | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const toast = useToast();

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set('step', String(step));
    setParams(next, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    pushEvent('booking_started', { event_listing_id: eventListingId });
  }, [eventListingId]);

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (b) => {
      setBooking(b);
      setStep(4);
      navigate(`/bookings/${b.id}?step=4`, { replace: true });
    },
    onError: (err: unknown) => {
      const apiErr = err as ApiError;
      if (apiErr.status === 409) {
        toast.push('Spot no longer available', 'error');
      } else if (apiErr.status === 402) {
        toast.push('Payment failed', 'error');
      } else {
        toast.push('Could not complete booking', 'error');
      }
    },
  });

  const total = spots * unitPrice;

  return (
    <div className="space-y-6" data-testid="booking-flow">
      <Stepper steps={['Spots', 'Contact', 'Payment', 'Done']} current={step} />
      {step === 1 && (
        <Step1SelectSpots
          available={available}
          unitPrice={unitPrice}
          spots={spots}
          onChange={setSpots}
          onContinue={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <Step2Contact
          spots={spots}
          unitPrice={unitPrice}
          initial={contact ?? undefined}
          onBack={() => setStep(1)}
          onContinue={(vals) => { setContact(vals); setStep(3); }}
        />
      )}
      {step === 3 && (
        <Step3Payment
          total={total}
          onBack={() => setStep(2)}
          onSuccess={async () => {
            await mutation.mutateAsync({
              event_listing_id: eventListingId,
              spots_reserved: spots,
              guest_name: contact?.name,
              guest_email: contact?.email,
              guest_phone: contact?.phone,
            });
          }}
          onError={() => undefined}
        />
      )}
      {step === 4 && booking && <Step4Confirmation booking={booking} />}
    </div>
  );
}
