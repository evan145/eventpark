import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded ${isActive ? 'text-primary-600 font-semibold' : 'text-gray-700 hover:text-primary-600'}`;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200" data-testid="site-header">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" aria-label="EventPark home" className="font-bold text-xl text-primary-600">
          EventPark
        </Link>
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={open}
          className="md:hidden btn-ghost"
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden>☰</span>
        </button>
        <nav className="hidden md:flex items-center gap-2" aria-label="Primary">
          <NavLink to="/events" className={navClass}>Events</NavLink>
          <NavLink to="/host/dashboard" className={navClass}>Host</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin" className={navClass}>Admin</NavLink>}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600" data-testid="user-email">{user.email}</span>
              <button type="button" onClick={logout} className="btn-ghost">Log out</button>
            </div>
          ) : (
            <NavLink to="/login" className={navClass}>Log in</NavLink>
          )}
        </nav>
      </div>
      {open && (
        <div className="md:hidden border-t border-gray-200" role="dialog" aria-label="Mobile navigation">
          <nav className="flex flex-col p-4 gap-1" aria-label="Mobile">
            <NavLink to="/events" className={navClass} onClick={() => setOpen(false)}>Events</NavLink>
            <NavLink to="/host/dashboard" className={navClass} onClick={() => setOpen(false)}>Host</NavLink>
            <NavLink to="/contact" className={navClass} onClick={() => setOpen(false)}>Contact</NavLink>
            {user ? (
              <button type="button" onClick={() => { logout(); setOpen(false); }} className="btn-ghost text-left">Log out</button>
            ) : (
              <NavLink to="/login" className={navClass} onClick={() => setOpen(false)}>Log in</NavLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
