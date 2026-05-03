import { request } from './client';
import type { AdminBookingRow, AdminListingRow, RevenueStats, EventSummary } from '../types';

export function adminListings(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return request<AdminListingRow[]>(`/api/admin/listings${qs}`);
}

export function adminUpdateListingStatus(id: number, status: 'approved' | 'rejected', reason?: string) {
  return request<{ id: number; status: string }>(`/api/admin/listings/${id}/status`, {
    method: 'PATCH',
    body: { status, reason },
  });
}

export function adminBookings() {
  return request<AdminBookingRow[]>(`/api/admin/bookings`);
}

export function adminRevenue() {
  return request<RevenueStats>(`/api/admin/analytics/revenue`);
}

export interface AdminEventCreate {
  name: string;
  venue_name: string;
  venue_address: string;
  event_date: string;
  event_time: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  description?: string;
}

export function adminCreateEvent(payload: AdminEventCreate) {
  return request<EventSummary>(`/api/admin/events`, { method: 'POST', body: payload });
}

export function adminDeleteEvent(id: number) {
  return request<{ id: number; deleted: boolean }>(`/api/admin/events/${id}`, { method: 'DELETE' });
}

export function adminCreateDispute(payload: { booking_id: number; resolution: string }) {
  return request<{ booking_id: number; resolution: string }>(`/api/admin/disputes`, { method: 'POST', body: payload });
}
