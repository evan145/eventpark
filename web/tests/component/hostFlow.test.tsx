import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen } from '../../src/test-utils/render';
import HostDashboard from '../../src/pages/HostDashboard';
import HostListingNew from '../../src/pages/HostListingNew';
import { fakeJwt } from '../../src/mocks/fixtures';

describe('Host flow', () => {
  beforeEach(() => {
    localStorage.setItem('eventpark_token', fakeJwt('host', 'host@example.com', 1));
  });

  it('dashboard shows three sections', async () => {
    renderWithProviders(<HostDashboard />);
    expect(await screen.findByRole('heading', { name: /my listings/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /upcoming bookings/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^earnings$/i })).toBeInTheDocument();
  });

  it('add listing CTA links to /host/listings/new', async () => {
    renderWithProviders(<HostDashboard />);
    const link = await screen.findByTestId('add-listing');
    expect(link).toHaveAttribute('href', '/host/listings/new');
  });

  it('listing wizard step 1 → step 2', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/host/listings/new" element={<HostListingNew />} />
      </Routes>,
      { route: '/host/listings/new' },
    );
    const addr = await screen.findByLabelText(/address/i);
    await userEvent.type(addr, '123 Test St');
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByTestId('wizard-step-2')).toBeInTheDocument();
  });
});
