import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../src/test-utils/render';
import SkipLink from '../../src/components/SkipLink';
import Modal from '../../src/components/Modal';

describe('Accessibility (smoke)', () => {
  it('skip link is present', () => {
    renderWithProviders(<SkipLink />);
    expect(screen.getByTestId('skip-link')).toHaveAttribute('href', '#main-content');
  });

  it('modal has role=dialog and aria-modal', () => {
    renderWithProviders(<Modal open onClose={() => undefined} title="Test"><button>x</button></Modal>);
    const dlg = screen.getByRole('dialog', { name: /test/i });
    expect(dlg).toHaveAttribute('aria-modal', 'true');
  });
});
