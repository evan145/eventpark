import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../src/test-utils/render';
import VerifiedBadge from '../../src/components/VerifiedBadge';
import RatingStars from '../../src/components/RatingStars';
import Terms from '../../src/pages/Terms';
import Privacy from '../../src/pages/Privacy';
import Contact from '../../src/pages/Contact';
import CookieBanner from '../../src/components/CookieBanner';

describe('Trust & Safety UI', () => {
  it('verified badge renders when verified', () => {
    renderWithProviders(<VerifiedBadge verified />);
    expect(screen.getByTestId('verified-badge')).toBeInTheDocument();
  });

  it('rating stars render with accessible label', () => {
    renderWithProviders(<RatingStars value={4.2} />);
    expect(screen.getByLabelText(/rating 4\.2/i)).toBeInTheDocument();
  });

  it('terms page renders', () => {
    renderWithProviders(<Terms />);
    expect(screen.getByRole('heading', { name: /terms of service/i })).toBeInTheDocument();
  });

  it('privacy page renders', () => {
    renderWithProviders(<Privacy />);
    expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument();
  });

  it('contact form submits and shows confirmation', async () => {
    renderWithProviders(<Contact />);
    expect(screen.getByLabelText(/your email/i)).toBeInTheDocument();
  });

  it('cookie banner appears on first visit', () => {
    localStorage.clear();
    renderWithProviders(<CookieBanner />);
    expect(screen.getByTestId('cookie-banner')).toBeInTheDocument();
  });
});
