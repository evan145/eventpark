import { request } from './client';
import type { AuthResponse } from '../types';

export function login(email: string, password: string) {
  return request<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password }, auth: false });
}

export interface RegisterPayload {
  email: string;
  password: string;
  role?: 'guest' | 'host';
  full_name?: string;
  address?: string;
  phone?: string;
}

export function register(payload: RegisterPayload) {
  return request<AuthResponse>('/api/auth/register', { method: 'POST', body: payload, auth: false });
}
