import { Helmet } from 'react-helmet-async';

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 prose">
      <Helmet><title>Terms — EventPark</title></Helmet>
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <p>By using EventPark you agree to the booking, hosting, and payment terms below.</p>
      <h2 id="cancellation" className="font-semibold mt-4">Cancellation policy</h2>
      <p>More than 48 hours before the event: full refund. 24-48 hours: 50% refund. Less than 24 hours: no refund.</p>
    </div>
  );
}
