import type { EventDetail, EventSummary, SpotSummary, ListingDetail, Booking, HostListing, HostEarnings, UpcomingHostBooking, AdminListingRow, AdminBookingRow, RevenueStats } from '../types';

export const futureDate = (offset = 30): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const eventSummary: EventSummary = {
  id: 1,
  name: 'Wisconsin vs Iowa',
  venue_name: 'Camp Randall Stadium',
  venue_address: '1440 Monroe St, Madison, WI',
  latitude: 43.0696,
  longitude: -89.4126,
  event_date: futureDate(14),
  event_time: '14:30:00',
};

export const eventDetail: EventDetail = { ...eventSummary, total_available_spots: 12 };

export const spotsList: SpotSummary[] = [
  { event_listing_id: 100, listing_id: 10, title: 'Driveway near gate', address: '123 Regent St', latitude: 43.07, longitude: -89.41, available_spots: 4, price_per_spot: 20, distance_miles: 0.4, status: 'approved' },
  { event_listing_id: 101, listing_id: 11, title: 'Side yard', address: '456 Park St', latitude: 43.072, longitude: -89.408, available_spots: 2, price_per_spot: 15, distance_miles: 0.6, status: 'approved' },
  { event_listing_id: 102, listing_id: 12, title: 'Garage', address: '789 Mills St', latitude: 43.075, longitude: -89.415, available_spots: 1, price_per_spot: 30, distance_miles: 0.2, status: 'approved' },
];

export const listingDetail: ListingDetail = {
  id: 10,
  title: 'Driveway near gate',
  description: 'Easy access to gate B, 5 minute walk.',
  address: '123 Regent St',
  latitude: 43.07,
  longitude: -89.41,
  number_of_spots: 4,
  price_per_spot: 20,
  status: 'approved',
  photos: null,
  host_rating: 4.5,
  host_total_bookings: 12,
  distance_miles: 0.4,
};

export const booking: Booking = {
  id: 5001,
  event_listing_id: 100,
  guest_name: 'Test Guest',
  guest_email: 'guest@example.com',
  guest_phone: '608-555-0123',
  spots_reserved: 2,
  total_price: 40,
  status: 'confirmed',
  stripe_payment_intent_id: 'pi_test_123',
  host_payout_amount: 32,
  confirmation_code: 'EP-20260301-A1B2',
  created_at: new Date().toISOString(),
  spot_address: '123 Regent St',
  directions_url: 'https://www.google.com/maps/dir/?api=1&destination=43.07,-89.41',
  host_name: 'Jane Host',
  host_phone: '608-555-9999',
};

export const hostListings: HostListing[] = [
  { id: 10, host_id: 1, title: 'Driveway near gate', description: null, number_of_spots: 4, price_per_spot: 20, latitude: 43.07, longitude: -89.41, address: '123 Regent St', status: 'pending', photos: null },
];

export const hostEarnings: HostEarnings = { total_earned: 120, pending: 40, bookings: [] };

export const upcomingBookings: UpcomingHostBooking[] = [
  { id: 5001, guest_name: 'Test Guest', guest_email: 'guest@example.com', guest_phone: '608-555-0123', spots_reserved: 2, total_price: 40, status: 'confirmed', confirmation_code: 'EP-20260301-A1B2' },
];

export const adminListings: AdminListingRow[] = [
  { id: 10, host_id: 1, title: 'Driveway near gate', status: 'pending', number_of_spots: 4, price_per_spot: 20, address: '123 Regent St' },
];

export const adminBookings: AdminBookingRow[] = [
  { id: 5001, guest_name: 'Test Guest', guest_email: 'guest@example.com', spots_reserved: 2, total_price: 40, status: 'confirmed', confirmation_code: 'EP-20260301-A1B2' },
];

export const revenueStats: RevenueStats = {
  total_bookings: 1, total_gross: 40, total_commission: 8, stripe_fees: 1.46, net_commission: 6.54,
};

export const fakeJwt = (role: 'guest' | 'host' | 'admin' = 'guest', email = 'user@example.com', userId = 1): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: String(userId), user_id: userId, email, role, exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `${header}.${payload}.signature`;
};

export const expiredJwt = (role: 'guest' | 'host' | 'admin' = 'guest'): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: '1', user_id: 1, email: 'expired@example.com', role, exp: Math.floor(Date.now() / 1000) - 3600 }));
  return `${header}.${payload}.signature`;
};
