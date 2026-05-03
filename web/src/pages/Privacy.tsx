import { Helmet } from 'react-helmet-async';

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 prose">
      <Helmet><title>Privacy — EventPark</title></Helmet>
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p>We collect only the information needed to make bookings work.</p>
    </div>
  );
}
