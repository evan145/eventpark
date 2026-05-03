import { lazy, Suspense, useState } from 'react';
import Skeleton from '../Skeleton';

const StripePaymentInner = lazy(() => import('./StripePaymentInner'));

interface Props {
  total: number;
  onBack: () => void;
  onSuccess: (paymentIntentId: string) => Promise<void> | void;
  onError: (msg: string) => void;
}

export default function Step3Payment({ total, onBack, onSuccess, onError }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const handleSuccess = async (id: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSuccess(id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="step3-heading" data-testid="step-3">
      <h2 id="step3-heading" className="text-xl font-semibold mb-4">Payment</h2>
      <Suspense fallback={<Skeleton className="h-32" />}>
        <StripePaymentInner
          total={total}
          submitting={submitting}
          onSuccess={handleSuccess}
          onError={onError}
        />
      </Suspense>
      <div className="mt-3">
        <button type="button" className="btn-ghost" onClick={onBack} disabled={submitting}>Back</button>
      </div>
    </section>
  );
}
