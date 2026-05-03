import { Helmet } from 'react-helmet-async';
import ListingWizard from '../components/host/ListingWizard';
import Breadcrumbs from '../components/Breadcrumbs';

export default function HostListingNew() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Helmet><title>New listing — EventPark</title></Helmet>
      <Breadcrumbs items={[{ label: 'Host', to: '/host/dashboard' }, { label: 'New listing' }]} />
      <h1 className="text-2xl font-bold mb-4">Add a parking spot</h1>
      <ListingWizard />
    </div>
  );
}
