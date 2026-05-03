import { type ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/Toast';

export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  routes?: string[];
}

export function renderWithProviders(ui: ReactNode, options: CustomRenderOptions = {}): RenderResult {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const initialEntries = options.routes ?? [options.route ?? '/'];
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <AuthProvider>
            <ToastProvider>{ui}</ToastProvider>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
    options,
  );
}

export * from '@testing-library/react';
