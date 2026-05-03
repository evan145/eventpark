import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../src/test-utils/render';
import BookingFlow from '../../src/components/booking/BookingFlow';

describe('Booking flow', () => {
  it('step 1 stepper enforces min/max', async () => {
    renderWithProviders(<BookingFlow eventListingId={100} available={3} unitPrice={20} />);
    expect(screen.getByTestId('spots-value')).toHaveTextContent('1');
    await userEvent.click(screen.getByLabelText(/decrease spots/i));
    expect(screen.getByTestId('spots-value')).toHaveTextContent('1');
    await userEvent.click(screen.getByLabelText(/increase spots/i));
    expect(screen.getByTestId('spots-value')).toHaveTextContent('2');
  });

  it('total updates as stepper changes', async () => {
    renderWithProviders(<BookingFlow eventListingId={100} available={3} unitPrice={20} />);
    await userEvent.click(screen.getByLabelText(/increase spots/i));
    expect(screen.getByTestId('step1-total')).toHaveTextContent('$40.00');
  });

  it('step 2 contact form validates email and phone', async () => {
    renderWithProviders(<BookingFlow eventListingId={100} available={3} unitPrice={20} />);
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    const name = await screen.findByLabelText(/full name/i);
    await userEvent.type(name, 'Jane');
    await userEvent.type(screen.getByLabelText(/^email$/i), 'not-an-email');
    await userEvent.type(screen.getByLabelText(/phone/i), '123');
    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }));
    await waitFor(() => expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument());
  });

  it('completes step 1 → 2 → 3 flow', async () => {
    renderWithProviders(<BookingFlow eventListingId={100} available={3} unitPrice={20} />);
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    await userEvent.type(await screen.findByLabelText(/full name/i), 'Jane Test');
    await userEvent.type(screen.getByLabelText(/^email$/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/phone/i), '608-555-0123');
    await userEvent.click(screen.getByRole('button', { name: /continue to payment/i }));
    expect(await screen.findByTestId('step-3')).toBeInTheDocument();
  });
});
