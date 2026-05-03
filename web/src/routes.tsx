import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Skeleton from './components/Skeleton';

const Landing = lazy(() => import('./pages/Landing'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const ListingDetail = lazy(() => import('./pages/ListingDetail'));
const BookingDetail = lazy(() => import('./pages/BookingDetail'));
const Login = lazy(() => import('./pages/Login'));
const HostSignup = lazy(() => import('./pages/HostSignup'));
const HostDashboard = lazy(() => import('./pages/HostDashboard'));
const HostListingNew = lazy(() => import('./pages/HostListingNew'));
const HostListingEdit = lazy(() => import('./pages/HostListingEdit'));
const Admin = lazy(() => import('./pages/Admin'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ServerError = lazy(() => import('./pages/ServerError'));

function Fallback() {
  return (
    <div className="p-8" aria-busy="true">
      <Skeleton className="h-8 w-48 mb-4" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          <Route path="/bookings/:id" element={<BookingDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/host/signup" element={<HostSignup />} />
          <Route
            path="/host/dashboard"
            element={
              <ProtectedRoute role="host">
                <HostDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/listings/new"
            element={
              <ProtectedRoute role="host">
                <HostListingNew />
              </ProtectedRoute>
            }
          />
          <Route
            path="/host/listings/:id/edit"
            element={
              <ProtectedRoute role="host">
                <HostListingEdit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
        </Route>
        <Route path="/500" element={<ServerError />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
