import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../src/test-utils/render';
import Header from '../../src/components/Header';
import Footer from '../../src/components/Footer';

describe('Navigation', () => {
  it('header logo links to /', () => {
    renderWithProviders(<Header />);
    const logo = screen.getByLabelText(/eventpark home/i);
    expect(logo).toHaveAttribute('href', '/');
  });

  it('footer has TOS, privacy, contact links', () => {
    renderWithProviders(<Footer />);
    expect(screen.getByRole('link', { name: /^terms$/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /^privacy$/i })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: /^contact$/i })).toHaveAttribute('href', '/contact');
  });
});
