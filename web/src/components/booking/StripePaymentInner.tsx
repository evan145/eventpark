import { useEffect, useMemo, useState } from 'react';
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { STRIPE_PK, IS_TEST } from '../../config';

interface Props {
  total: number;
  submitting: boolean;
  onSuccess: (paymentIntentId: string) => void;
  onError: (msg: string) => void;
}

function PayButton({ total, submitting, onSuccess, onError }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const disabled = !stripe || !elements || busy || submitting;

  const handlePay = async () => {
    if (disabled) return;
    setBusy(true);
    setErr(null);
    try {
      if (!stripe || !elements) throw new Error('Stripe not loaded');
      const card = elements.getElement(CardElement);
      if (!card) throw new Error('Card element missing');
      const { error, paymentMethod } = await stripe.createPaymentMethod({ type: 'card', card });
      if (error) {
        setErr(error.message ?? 'Payment failed');
        onError(error.message ?? 'Payment failed');
        return;
      }
      onSuccess(paymentMethod.id);
    } catch (e) {
      const m = (e as Error).message;
      setErr(m);
      onError(m);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="card p-3 mb-3" data-testid="stripe-card-element">
        <CardElement options={{ disabled }} />
      </div>
      {err && <p role="alert" className="text-sm text-red-600 mb-2">{err}</p>}
      <button
        type="button"
        className="btn-primary"
        disabled={disabled}
        onClick={handlePay}
        data-testid="pay-button"
      >
        Pay ${total.toFixed(2)}
      </button>
    </div>
  );
}

export default function StripePaymentInner(props: Props) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [loadingDone, setLoadingDone] = useState(false);

  useEffect(() => {
    if (IS_TEST) { setLoadingDone(true); return; }
    let cancelled = false;
    loadStripe(STRIPE_PK)
      .then((s) => { if (!cancelled) { setStripe(s); setLoadingDone(true); } })
      .catch(() => { if (!cancelled) setLoadingDone(true); });
    return () => { cancelled = true; };
  }, []);

  const stripePromise = useMemo(() => Promise.resolve(stripe), [stripe]);

  if (IS_TEST) {
    return (
      <div>
        <div className="card p-3 mb-3" data-testid="stripe-card-element">
          <input aria-label="Card number (test mode)" placeholder="4242 4242 4242 4242" />
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={!loadingDone || props.submitting}
          onClick={() => props.onSuccess('pi_test_mock')}
          data-testid="pay-button"
        >
          Pay ${props.total.toFixed(2)}
        </button>
      </div>
    );
  }

  if (!stripe) {
    return (
      <div>
        <div className="card p-3 mb-3 bg-gray-50 text-gray-500" data-testid="stripe-card-element">
          Loading payment…
        </div>
        <button type="button" className="btn-primary" disabled data-testid="pay-button">
          Pay ${props.total.toFixed(2)}
        </button>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PayButton {...props} />
    </Elements>
  );
}
