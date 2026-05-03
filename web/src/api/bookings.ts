import { request } from './client';
import type { Booking } from '../types';

export interface CreateBookingPayload {
  event_listing_id: number;
  spots_reserved: number;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  payment_intent_id?: string;
}

export function createBooking(payload: CreateBookingPayload) {
  return request<Booking>('/api/bookings', { method: 'POST', body: payload });
}

export function getBooking(id: number) {
  return request<Booking>(`/api/bookings/${id}`);
}

export interface CancelBookingResponse {
  id: number;
  status: string;
  refund_amount: number;
  refund_percent: number;
}

export function cancelBooking(id: number, guestEmail?: string) {
  return request<CancelBookingResponse>(`/api/bookings/${id}/cancel`, {
    method: 'POST',
    body: guestEmail ? { guest_email: guestEmail } : {},
  });
}
