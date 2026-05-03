import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center" data-testid="not-found">
      <Helmet><title>Not found — EventPark</title></Helmet>
      <h1 className="text-3xl font-bold mb-2">404 — Page not found</h1>
      <p className="mb-4">We couldn't find what you were looking for.</p>
      <Link to="/" className="btn-primary">Go home</Link>
    </div>
  );
}
