import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { register as apiRegister } from '../api/auth';
import { createProfile } from '../api/host';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../api/client';
import { pushEvent } from '../hooks/useAnalytics';

interface FormVals {
  email: string;
  password: string;
  full_name: string;
  address: string;
  phone: string;
}

function strength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export default function HostSignup() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormVals>();
  const pw = watch('password') ?? '';
  const sLevel = strength(pw);

  const m = useMutation({
    mutationFn: async (vals: FormVals) => {
      const auth = await apiRegister({
        email: vals.email,
        password: vals.password,
        role: 'host',
        full_name: vals.full_name,
        address: vals.address,
        phone: vals.phone,
      });
      return auth;
    },
    onSuccess: async (data, vars) => {
      auth.login(data.token, data.user);
      try {
        await createProfile({ full_name: vars.full_name, address: vars.address, phone: vars.phone });
      } catch { /* profile may already exist */ }
      pushEvent('host_signup', { user_id: data.user.id });
      navigate('/host/dashboard', { replace: true });
    },
    onError: (err: unknown) => {
      const apiErr = err as ApiError;
      if (apiErr.status === 409) setServerError('That email is already registered');
      else setServerError('Could not create account');
    },
  });

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Helmet><title>Become a host — EventPark</title></Helmet>
      <h1 className="text-2xl font-bold mb-4">Become a host</h1>
      <form onSubmit={handleSubmit((v) => { setServerError(null); m.mutate(v); })} noValidate>
        <div className="mb-3">
          <label htmlFor="su-email">Email</label>
          <input id="su-email" type="email" aria-invalid={!!errors.email} {...register('email', { required: 'Email is required' })} />
          {errors.email && <p role="alert" className="text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div className="mb-3">
          <label htmlFor="su-password">Password</label>
          <input id="su-password" type="password" aria-invalid={!!errors.password} {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })} />
          <div className="mt-1 h-2 bg-gray-200 rounded" aria-hidden>
            <div className="h-2 rounded bg-primary-600" style={{ width: `${(sLevel / 4) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-500" data-testid="pw-strength">Strength: {['weak', 'weak', 'okay', 'good', 'strong'][sLevel]}</p>
          {errors.password && <p role="alert" className="text-sm text-red-600">{errors.password.message}</p>}
        </div>
        <div className="mb-3">
          <label htmlFor="su-name">Full name</label>
          <input id="su-name" type="text" aria-invalid={!!errors.full_name} {...register('full_name', { required: 'Name is required' })} />
          {errors.full_name && <p role="alert" className="text-sm text-red-600">{errors.full_name.message}</p>}
        </div>
        <div className="mb-3">
          <label htmlFor="su-address">Address</label>
          <input id="su-address" type="text" aria-invalid={!!errors.address} {...register('address', { required: 'Address is required' })} />
          {errors.address && <p role="alert" className="text-sm text-red-600">{errors.address.message}</p>}
        </div>
        <div className="mb-3">
          <label htmlFor="su-phone">Phone</label>
          <input id="su-phone" type="tel" aria-invalid={!!errors.phone} {...register('phone', { required: 'Phone is required' })} />
          {errors.phone && <p role="alert" className="text-sm text-red-600">{errors.phone.message}</p>}
        </div>
        {serverError && <p role="alert" className="text-sm text-red-600 mb-3">{serverError}</p>}
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting || m.isPending}>Create account</button>
      </form>
    </div>
  );
}
