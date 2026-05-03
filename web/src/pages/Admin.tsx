import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PendingListingsTab from '../components/admin/PendingListingsTab';
import AllBookingsTab from '../components/admin/AllBookingsTab';
import RevenueDashboard from '../components/admin/RevenueDashboard';
import EventsTab from '../components/admin/EventsTab';
import DisputesTab from '../components/admin/DisputesTab';

const TABS = ['Pending', 'Bookings', 'Revenue', 'Events', 'Disputes'] as const;
type Tab = typeof TABS[number];

export default function Admin() {
  const [tab, setTab] = useState<Tab>('Pending');
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Helmet><title>Admin — EventPark</title></Helmet>
      <h1 className="text-2xl font-bold mb-4">Admin console</h1>
      <div role="tablist" aria-label="Admin tabs" className="flex gap-2 mb-4 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`px-3 py-2 ${tab === t ? 'border-b-2 border-primary-600 font-semibold' : 'text-gray-600'}`}
            onClick={() => setTab(t)}
            data-testid={`tab-${t.toLowerCase()}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Pending' && <PendingListingsTab />}
      {tab === 'Bookings' && <AllBookingsTab />}
      {tab === 'Revenue' && <RevenueDashboard />}
      {tab === 'Events' && <EventsTab />}
      {tab === 'Disputes' && <DisputesTab />}
    </div>
  );
}
