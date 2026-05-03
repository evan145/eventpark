import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../src/test-utils/render';
import EmptyState from '../../src/components/EmptyState';
import Skeleton from '../../src/components/Skeleton';
import NotFound from '../../src/pages/NotFound';
import ServerError from '../../src/pages/ServerError';
import OfflineBanner from '../../src/components/OfflineBanner';

describe('Loading, empty & error states', () => {
  it('skeleton renders', () => {
    renderWithProviders(<Skeleton />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('empty state with title and message', () => {
    renderWithProviders(<EmptyState title="None" message="Nothing here." />);
    expect(screen.getByText(/none/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing here/i)).toBeInTheDocument();
  });

  it('404 page links home', () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/');
  });

  it('500 page links home', () => {
    renderWithProviders(<ServerError />);
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/');
  });

  it('offline banner appears when offline', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    renderWithProviders(<OfflineBanner />);
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });
});
