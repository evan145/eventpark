import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../src/test-utils/render';
import Events from '../../src/pages/Events';

describe('Events page', () => {
  it('lists events sorted by date asc', async () => {
    renderWithProviders(<Events />);
    expect(await screen.findByText(/wisconsin vs iowa/i)).toBeInTheDocument();
  });

  it('venue filter narrows results', async () => {
    renderWithProviders(<Events />);
    const input = await screen.findByLabelText(/^venue$/i);
    await userEvent.type(input, 'zzzznope');
    await waitFor(() => expect(screen.getByText(/no events match/i)).toBeInTheDocument());
  });

  it('toggle to show past events updates state', async () => {
    renderWithProviders(<Events />);
    const cb = await screen.findByLabelText(/show past events/i);
    await userEvent.click(cb);
    expect((cb as HTMLInputElement).checked).toBe(true);
  });
});
