import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../src/test-utils/render';
import Admin from '../../src/pages/Admin';
import { fakeJwt } from '../../src/mocks/fixtures';

describe('Admin console', () => {
  beforeEach(() => {
    localStorage.setItem('eventpark_token', fakeJwt('admin', 'admin@example.com', 99));
  });

  it('renders pending listings tab by default', async () => {
    renderWithProviders(<Admin />);
    expect(await screen.findByTestId('pending-listings')).toBeInTheDocument();
  });

  it('switches to revenue tab', async () => {
    renderWithProviders(<Admin />);
    await userEvent.click(screen.getByTestId('tab-revenue'));
    expect(await screen.findByTestId('revenue-dashboard')).toBeInTheDocument();
  });

  it('reject button opens reason modal', async () => {
    renderWithProviders(<Admin />);
    await userEvent.click(await screen.findByTestId('reject-10'));
    expect(await screen.findByRole('dialog', { name: /reject listing/i })).toBeInTheDocument();
  });
});
