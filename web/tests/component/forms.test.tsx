import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../src/test-utils/render';
import HostSignup from '../../src/pages/HostSignup';

describe('Forms & validation', () => {
  it('inline errors appear below fields with aria-invalid', async () => {
    renderWithProviders(<HostSignup />);
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    const email = await screen.findByLabelText(/email/i);
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });

  it('all inputs have associated labels', () => {
    renderWithProviders(<HostSignup />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });
});
