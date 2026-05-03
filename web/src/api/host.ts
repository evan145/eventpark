import { request } from './client';
import type { HostListing, HostEarnings, UpcomingHostBooking, HostProfile } from '../types';

export interface CreateListingPayload {
  title: string;
  description?: string;
  number_of_spots: number;
  price_per_spot: number;
  address: string;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  photo_base64?: string;
}

export function createListing(payload: CreateListingPayload) {
  return request<HostListing>('/api/host/listings', { method: 'POST', body: payload });
}

export function listMyListings() {
  return request<HostListing[]>('/api/host/listings');
}

export function getMyListing(id: number) {
  return request<HostListing>(`/api/host/listings/${id}`);
}

export function updateListing(id: number, patch: Partial<CreateListingPayload>) {
  return request<HostListing>(`/api/host/listings/${id}`, { method: 'PUT', body: patch });
}

export function deleteListing(id: number) {
  return request<{ id: number; status: string }>(`/api/host/listings/${id}`, { method: 'DELETE' });
}

export function getUpcomingBookings() {
  return request<UpcomingHostBooking[]>('/api/host/bookings/upcoming');
}

export function getEarnings() {
  return request<HostEarnings>('/api/host/earnings');
}

export function getProfile() {
  return request<HostProfile>('/api/host/profile');
}

export function createProfile(payload: { full_name: string; address: string; phone?: string }) {
  return request<HostProfile>('/api/host/profile', { method: 'POST', body: payload });
}
