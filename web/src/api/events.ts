import { request } from './client';
import type { EventDetail, EventSummary, SpotSummary } from '../types';

export function listEvents(params: { venue?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.venue) qs.set('venue', params.venue);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return request<EventSummary[]>(`/api/events${suffix}`, { auth: false });
}

export function getEvent(id: number) {
  return request<EventDetail>(`/api/events/${id}`, { auth: false });
}

export interface SpotsQuery {
  sort?: 'price' | 'distance';
  max_price?: number;
  min_spots?: number;
  radius?: number;
}

export function getEventSpots(id: number, query: SpotsQuery = {}) {
  const qs = new URLSearchParams();
  if (query.sort) qs.set('sort', query.sort);
  if (query.max_price != null) qs.set('max_price', String(query.max_price));
  if (query.min_spots != null) qs.set('min_spots', String(query.min_spots));
  if (query.radius != null) qs.set('radius', String(query.radius));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return request<SpotSummary[]>(`/api/events/${id}/spots${suffix}`, { auth: false });
}
