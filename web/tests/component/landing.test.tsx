import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderWithProviders, screen, waitFor } from '../../src/test-utils/render';
import Landing from '../../src/pages/Landing';
import { server } from '../../src/mocks/server';

describe('Landing page', () => {
  it('renders EventPark branding and tagline', async () => {
    renderWithProviders(<Landing />);
    expect(await screen.findByRole('heading', { name: /park before you pack/i })).toBeInTheDocument();
  });

  it('shows the two primary CTAs', async () => {
    renderWithProviders(<Landing />);
    expect(await screen.findByRole('button', { name: /find parking/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /list your spots/i })).toBeInTheDocument();
  });

  it('hero search bar accepts venue and date', async () => {
    renderWithProviders(<Landing />);
    const venue = screen.getByLabelText(/venue/i);
    const date = screen.getByLabelText(/date/i);
    expect(venue).toBeInTheDocument();
    expect(date).toBeInTheDocument();
  });

  it('renders upcoming events from API', async () => {
    renderWithProviders(<Landing />);
    expect(await screen.findByText(/wisconsin vs iowa/i)).toBeInTheDocument();
  });

  it('renders 3 how-it-works steps', async () => {
    renderWithProviders(<Landing />);
    expect(await screen.findByText(/1\. browse spots/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. reserve/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. park & enjoy/i)).toBeInTheDocument();
  });

  it('shows empty state when no events', async () => {
    server.use(http.get('*/api/events', () => HttpResponse.json([])));
    renderWithProviders(<Landing />);
    expect(await screen.findByText(/no upcoming events/i)).toBeInTheDocument();
  });

  it('shows retry on events fetch failure', async () => {
    server.use(http.get('*/api/events', () => HttpResponse.json({ detail: 'boom' }, { status: 500 })));
    renderWithProviders(<Landing />);
    await waitFor(() => expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument());
  });
});
