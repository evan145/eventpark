export type Role = 'guest' | 'host' | 'admin';

export interface User {
  id: number;
  email: string;
  role: Role;
  phone?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface EventSummary {
  id: number;
  name: string;
  venue_name: string;
  venue_address: string;
  latitude: number;
  longitude: number;
  event_date: string;
  event_time: string;
}

export interface EventDetail extends EventSummary {
  total_available_spots: number;
}

export interface SpotSummary {
  event_listing_id: number;
  listing_id: number;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  available_spots: number;
  price_per_spot: number;
  distance_miles: number;
  status: string;
}

export interface ListingDetail {
  id: number;
  title: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  number_of_spots: number;
  price_per_spot: number;
  status: string;
  photos: string[] | null;
  host_rating: number | null;
  host_total_bookings: number;
  distance_miles: number | null;
}

export interface HostListing {
  id: number;
  host_id: number;
  title: string;
  description: string | null;
  number_of_spots: number;
  price_per_spot: number;
  latitude: number;
  longitude: number;
  address: string;
  status: string;
  photos: string[] | null;
}

export interface Booking {
  id: number;
  event_listing_id: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  spots_reserved: number;
  total_price: number;
  status: string;
  stripe_payment_intent_id: string | null;
  host_payout_amount: number;
  confirmation_code: string;
  created_at: string | null;
  spot_address?: string;
  directions_url?: string;
  host_name?: string | null;
  host_phone?: string | null;
}

export interface UpcomingHostBooking {
  id: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  spots_reserved: number;
  total_price: number;
  status: string;
  confirmation_code: string;
}

export interface HostEarnings {
  total_earned: number;
  pending: number;
  bookings: Array<{
    booking_id: number;
    status: string;
    host_payout_amount: number;
    payout_released: boolean;
  }>;
}

export interface AdminListingRow {
  id: number;
  host_id: number;
  title: string;
  status: string;
  number_of_spots: number;
  price_per_spot: number;
  address: string;
}

export interface AdminBookingRow {
  id: number;
  guest_name: string;
  guest_email: string;
  spots_reserved: number;
  total_price: number;
  status: string;
  confirmation_code: string;
}

export interface RevenueStats {
  total_bookings: number;
  total_gross: number;
  total_commission: number;
  stripe_fees: number;
  net_commission: number;
}

export interface HostProfile {
  id: number;
  user_id: number;
  full_name: string;
  address: string;
  address_verified: boolean;
  rating: number;
  total_bookings: number;
}
