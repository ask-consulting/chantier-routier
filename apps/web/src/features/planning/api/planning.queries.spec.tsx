import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '@/shared/api/http-client';
import { planKey, useDeleteWorksitePlan } from './planning.queries';

let mock: MockAdapter;
let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

describe('changing a plan', () => {
  it('refreshes the plan and the « Mes chantiers » summary that adds it up', async () => {
    mock.onDelete('/worksites/ws/plan').reply(204);
    client.setQueryData(planKey('ws'), { tasks: [] });
    client.setQueryData(['my-worksites', 'ws'], { phases: [] });
    const { result } = renderHook(() => useDeleteWorksitePlan('ws'), { wrapper });

    await act(() => result.current.mutateAsync());

    expect(client.getQueryState(planKey('ws'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(['my-worksites', 'ws'])?.isInvalidated).toBe(true);
  });
});
