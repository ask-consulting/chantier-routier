import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';
import messages from '../../messages/fr.json';

/**
 * Rendering a screen the way the application renders it.
 *
 * Components under `features/` read two contexts that the route layout provides:
 * the message bundle and the React Query client. Rendering them bare throws on
 * the first `useTranslations`, and stubbing the translations away would test a
 * component that no longer speaks French — the labels are half of what these
 * screens are.
 *
 * **The real `fr.json`**, not a fixture: a key added to a component and
 * forgotten in the bundle then fails here, which is exactly the mistake worth
 * catching. `next-intl` throws on a missing key.
 *
 * Retries are off. A test that asserts an error state should not wait for three
 * attempts first.
 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="fr" messages={messages}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </NextIntlClientProvider>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}
