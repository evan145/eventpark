import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../src/test-utils/render';
import Landing from '../../src/pages/Landing';

describe('Analytics', () => {
  beforeEach(() => {
    window.__analyticsEvents = [];
  });

  it('search_submit fires when search submitted', async () => {
    renderWithProviders(<Landing />);
    await userEvent.click(await screen.findByRole('button', { name: /find parking/i }));
    expect(window.__analyticsEvents?.some((e) => e.name === 'search_submit')).toBe(true);
  });
});
