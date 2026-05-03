import { http, HttpResponse } from 'msw';
import * as f from './fixtures';

export const handlers = [
  http.get('*/api/events', () => HttpResponse.json([f.eventSummary])),
  http.get('*/api/events/:id', ({ params }) => {
    if (params.id === '1') return HttpResponse.json(f.eventDetail);
    return HttpResponse.json({ detail: 'event not found' }, { status: 404 });
  }),
  http.get('*/api/events/:id/spots', () => HttpResponse.json(f.spotsList)),
  http.get('*/api/listings/:id', () => HttpResponse.json(f.listingDetail)),
  http.post('*/api/bookings', async () => HttpResponse.json(f.booking, { status: 201 })),
  http.get('*/api/bookings/:id', () => HttpResponse.json(f.booking)),
  http.post('*/api/bookings/:id/cancel', () =>
    HttpResponse.json({ id: 5001, status: 'cancelled', refund_amount: 40, refund_percent: 1.0 }),
  ),
  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password === 'wrong') return HttpResponse.json({ detail: 'invalid credentials' }, { status: 401 });
    return HttpResponse.json({
      token: f.fakeJwt('guest', body.email, 7),
      user: { id: 7, email: body.email, role: 'guest', phone: null },
    });
  }),
  http.post('*/api/auth/register', async ({ request }) => {
    const body = (await request.json()) as { email: string; role?: string };
    if (body.email === 'taken@example.com') return HttpResponse.json({ detail: 'email already registered' }, { status: 409 });
    const role = (body.role as 'guest' | 'host' | 'admin') ?? 'guest';
    return HttpResponse.json({
      token: f.fakeJwt(role, body.email, 8),
      user: { id: 8, email: body.email, role, phone: null },
    });
  }),
  http.post('*/api/host/profile', () =>
    HttpResponse.json({ id: 1, user_id: 8, full_name: 'Host', address: '1 Main St', address_verified: false, rating: 0, total_bookings: 0 }),
  ),
  http.get('*/api/host/profile', () =>
    HttpResponse.json({ id: 1, user_id: 8, full_name: 'Host', address: '1 Main St', address_verified: true, rating: 4.5, total_bookings: 12 }),
  ),
  http.get('*/api/host/listings', () => HttpResponse.json(f.hostListings)),
  http.get('*/api/host/listings/:id', () => HttpResponse.json(f.hostListings[0])),
  http.put('*/api/host/listings/:id', () => HttpResponse.json(f.hostListings[0])),
  http.delete('*/api/host/listings/:id', () => HttpResponse.json({ id: 10, status: 'inactive' })),
  http.post('*/api/host/listings', () => HttpResponse.json(f.hostListings[0], { status: 201 })),
  http.get('*/api/host/bookings/upcoming', () => HttpResponse.json(f.upcomingBookings)),
  http.get('*/api/host/earnings', () => HttpResponse.json(f.hostEarnings)),
  http.get('*/api/admin/listings', () => HttpResponse.json(f.adminListings)),
  http.patch('*/api/admin/listings/:id/status', async ({ request, params }) => {
    const body = (await request.json()) as { status: string };
    return HttpResponse.json({ id: Number(params.id), status: body.status });
  }),
  http.get('*/api/admin/bookings', () => HttpResponse.json(f.adminBookings)),
  http.get('*/api/admin/analytics/revenue', () => HttpResponse.json(f.revenueStats)),
  http.post('*/api/admin/disputes', () => HttpResponse.json({ booking_id: 5001, resolution: 'refund' }, { status: 201 })),
  http.post('*/api/admin/events', () => HttpResponse.json(f.eventSummary, { status: 201 })),
  http.delete('*/api/admin/events/:id', ({ params }) => HttpResponse.json({ id: Number(params.id), deleted: true })),
];
