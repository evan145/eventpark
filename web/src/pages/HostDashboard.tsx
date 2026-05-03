import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { listMyListings, getEarnings, getUpcomingBookings } from '../api/host';
import ListingsTable from '../components/host/ListingsTable';
import EarningsWidget from '../components/host/EarningsWidget';
import UpcomingBookingsTable from '../components/host/UpcomingBookingsTable';
import EmptyState from '../components/EmptyState';
import Skeleton from '../components/Skeleton';
import Breadcrumbs from '../components/Breadcrumbs';

export default function HostDashboard() {
  const listings = useQuery({ queryKey: ['host', 'listings'], queryFn: listMyListings });
  const earnings = useQuery({ queryKey: ['host', 'earnings'], queryFn: getEarnings });
  const upcoming = useQuery({ queryKey: ['host', 'upcoming'], queryFn: getUpcomingBookings });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Helmet><title>Host dashboard — EventPark</title></Helmet>
      <Breadcrumbs items={[{ label: 'Host', to: '/host/dashboard' }, { label: 'Dashboard' }]} />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Host dashboard</h1>
        <Link to="/host/listings/new" className="btn-primary" data-testid="add-listing">Add listing</Link>
      </div>

      <section aria-labelledby="my-listings" className="mb-6">
        <h2 id="my-listings" className="text-lg font-semibold mb-2">My listings</h2>
        {listings.isLoading ? (
          <Skeleton count={3} className="h-12 w-full" />
        ) : listings.isError ? (
          <button type="button" className="btn-secondary" onClick={() => listings.refetch()}>Retry</button>
        ) : (listings.data ?? []).length === 0 ? (
          <EmptyState title="No listings yet" message="Add your first parking spot." action={<Link to="/host/listings/new" className="btn-primary">Add listing</Link>} />
        ) : (
          <ListingsTable listings={listings.data ?? []} />
        )}
      </section>

      <section aria-labelledby="upcoming" className="mb-6">
        <h2 id="upcoming" className="text-lg font-semibold mb-2">Upcoming bookings</h2>
        {upcoming.isLoading ? (
          <Skeleton count={2} className="h-10 w-full" />
        ) : upcoming.isError ? (
          <button type="button" className="btn-secondary" onClick={() => upcoming.refetch()}>Retry</button>
        ) : (
          <UpcomingBookingsTable rows={upcoming.data ?? []} />
        )}
      </section>

      <section aria-labelledby="earnings-h">
        <h2 id="earnings-h" className="text-lg font-semibold mb-2">Earnings</h2>
        {earnings.isLoading ? <Skeleton className="h-24" /> : earnings.data ? <EarningsWidget data={earnings.data} /> : null}
      </section>
    </div>
  );
}
