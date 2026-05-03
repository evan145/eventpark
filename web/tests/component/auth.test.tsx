import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen, waitFor } from '../../src/test-utils/render';
import Login from '../../src/pages/Login';
import HostDashboard from '../../src/pages/HostDashboard';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import { expiredJwt } from '../../src/mocks/fixtures';

describe('Auth', () => {
  it('login form requires fields', async () => {
    renderWithProviders(<Login />);
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  it('invalid credentials show inline error', async () => {
    renderWithProviders(<Login />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /^log in$/i }));
    await waitFor(() => expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument());
  });

  it('expired token logs user out', async () => {
    localStorage.setItem('eventpark_token', expiredJwt('host'));
    renderWithProviders(
      <Routes>
        <Route path="/host/dashboard" element={<ProtectedRoute role="host"><HostDashboard /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
      </Routes>,
      { route: '/host/dashboard' },
    );
    expect(await screen.findByRole('heading', { name: /^log in$/i })).toBeInTheDocument();
  });
});
