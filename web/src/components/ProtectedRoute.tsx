import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';

export default function ProtectedRoute({ children, role }: { children: ReactNode; role?: Role }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }
  if (role && user.role !== role && user.role !== 'admin') {
    return (
      <div className="p-8 max-w-2xl mx-auto" role="alert">
        <h1 className="text-2xl font-bold mb-2">403 — Access denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}
