import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { login } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../api/client';

interface FormVals { email: string; password: string }

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormVals>();

  const m = useMutation({
    mutationFn: (vals: FormVals) => login(vals.email, vals.password),
    onSuccess: (data) => {
      auth.login(data.token, data.user);
      const redirect = params.get('redirect');
      navigate(redirect || (data.user.role === 'host' ? '/host/dashboard' : '/'), { replace: true });
    },
    onError: (err: unknown) => {
      const apiErr = err as ApiError;
      setServerError(apiErr.status === 401 ? 'Invalid email or password' : 'Something went wrong');
    },
  });

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Helmet><title>Log in — EventPark</title></Helmet>
      <h1 className="text-2xl font-bold mb-4">Log in</h1>
      <form onSubmit={handleSubmit((v) => { setServerError(null); m.mutate(v); })} noValidate>
        <div className="mb-3">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'login-email-err' : undefined}
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && <p id="login-email-err" role="alert" className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
        </div>
        <div className="mb-3">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'login-password-err' : undefined}
            {...register('password', { required: 'Password is required' })}
          />
          {errors.password && <p id="login-password-err" role="alert" className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
        </div>
        {serverError && <p role="alert" className="text-sm text-red-600 mb-3">{serverError}</p>}
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting || m.isPending}>Log in</button>
      </form>
      <div className="mt-3 text-sm flex justify-between">
        <Link to="/forgot-password" className="text-primary-600">Forgot password?</Link>
        <Link to="/host/signup" className="text-primary-600">Sign up</Link>
      </div>
    </div>
  );
}
