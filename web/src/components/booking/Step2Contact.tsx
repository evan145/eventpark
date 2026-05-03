import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';

const phoneRegex = /^(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}$/;

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  phone: z.string().regex(phoneRegex, 'Enter a valid US phone number'),
});

export type ContactValues = z.infer<typeof schema>;

interface Props {
  spots: number;
  unitPrice: number;
  initial?: Partial<ContactValues>;
  onBack: () => void;
  onContinue: (vals: ContactValues) => void;
}

export default function Step2Contact({ spots, unitPrice, initial, onBack, onContinue }: Props) {
  const { user } = useAuth();
  const total = (spots * unitPrice).toFixed(2);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    defaultValues: {
      name: initial?.name ?? user?.email?.split('@')[0] ?? '',
      email: initial?.email ?? user?.email ?? '',
      phone: initial?.phone ?? '',
    },
  });

  const onSubmit = handleSubmit((vals) => {
    const result = schema.safeParse(vals);
    if (!result.success) return;
    onContinue(result.data);
  });

  return (
    <section aria-labelledby="step2-heading" data-testid="step-2">
      <h2 id="step2-heading" className="text-xl font-semibold mb-4">Review & contact info</h2>
      <div className="card p-4 mb-4">
        <p>{spots} spot{spots === 1 ? '' : 's'} × ${unitPrice.toFixed(2)} = <strong>${total}</strong></p>
      </div>
      <details className="mb-4 card p-3" data-testid="cancellation-policy">
        <summary>Cancellation policy</summary>
        <p className="mt-2 text-sm">
          More than 48 hours before the event: full refund. 24-48 hours: 50% refund. Less than 24 hours: no refund.
        </p>
      </details>
      <form onSubmit={onSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            type="text"
            readOnly={!!user}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-err' : undefined}
            {...register('name', { required: 'Name is required' })}
          />
          {errors.name && <p id="name-err" role="alert" className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
        </div>
        <div className="mb-3">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            readOnly={!!user}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-err' : undefined}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
            })}
          />
          {errors.email && <p id="email-err" role="alert" className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
        </div>
        <div className="mb-3">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="tel"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-err' : undefined}
            {...register('phone', {
              required: 'Phone is required',
              pattern: { value: phoneRegex, message: 'Enter a valid US phone number' },
            })}
          />
          {errors.phone && <p id="phone-err" role="alert" className="text-sm text-red-600 mt-1">{errors.phone.message}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={onBack}>Back</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>Continue to payment</button>
        </div>
      </form>
    </section>
  );
}
