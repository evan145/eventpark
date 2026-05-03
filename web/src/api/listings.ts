import { request } from './client';
import type { ListingDetail } from '../types';

export function getListing(id: number, eventId?: number) {
  const qs = eventId != null ? `?event_id=${eventId}` : '';
  return request<ListingDetail>(`/api/listings/${id}${qs}`, { auth: false });
}
