import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function ServerError() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center" data-testid="server-error">
      <Helmet><title>Server error — EventPark</title></Helmet>
      <h1 className="text-3xl font-bold mb-2">500 — Something broke</h1>
      <p className="mb-4">We're working on it. Please try again later.</p>
      <Link to="/" className="btn-primary">Go home</Link>
    </div>
  );
}
