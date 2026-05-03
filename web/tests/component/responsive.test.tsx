import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../src/test-utils/render';
import Header from '../../src/components/Header';

describe('Responsive', () => {
  it('header renders hamburger button (visible on small screens via CSS)', () => {
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: q.includes('max-width'),
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    renderWithProviders(<Header />);
    expect(screen.getByLabelText(/open navigation menu/i)).toBeInTheDocument();
  });
});
