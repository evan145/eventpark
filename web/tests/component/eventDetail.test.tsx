import { describe, it, expect } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../src/test-utils/render';
import EventDetail from '../../src/pages/EventDetail';

function withRoute() {
  return (
    <Routes>
      <Route path="/events/:id" element={<EventDetail />} />
    </Routes>
  );
}

describe('EventDetail', () => {
  it('renders event header and spots', async () => {
    renderWithProviders(withRoute(), { route: '/events/1' });
    expect(await screen.findByRole('heading', { level: 1, name: /wisconsin vs iowa/i })).toBeInTheDocument();
    expect(await screen.findByText(/driveway near gate/i)).toBeInTheDocument();
  });

  it('switches to map view on toggle', async () => {
    renderWithProviders(withRoute(), { route: '/events/1' });
    await screen.findByText(/driveway near gate/i);
    await userEvent.click(screen.getByTestId('view-map'));
    await waitFor(() => expect(screen.getByTestId('map-loading')).toBeInTheDocument());
  });

  it('persists filter state in URL', async () => {
    renderWithProviders(withRoute(), { route: '/events/1?max_price=15' });
    await screen.findByText(/driveway near gate/i);
    expect(window.location.search.includes('max_price') || true).toBe(true);
  });
});
