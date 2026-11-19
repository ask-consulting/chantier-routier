import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '@/shared/api/http-client';
import { equipmentKeys } from '@/features/equipment';
import { planKey } from '@/features/planning';
import { workerKeys } from '@/features/workers';
import { useActiveWorkers, useAssignments, usePlan } from './my-worksites.queries';

let mock: MockAdapter;
let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mock = new MockAdapter(apiClient);
  mock.onGet('/worksites/ws/plan').reply(200, { tasks: [] });
  mock.onGet(/\/equipment-assignments/).reply(200, { items: [], total: 0, page: 1, limit: 100 });
  mock.onGet(/\/workers/).reply(200, { items: [], total: 0, page: 1, limit: 1 });
});
afterEach(() => mock.restore());

/**
 * « Mes chantiers » reads data other features own. It must read it from their
 * cache entries: under keys of its own, a change made there would stay
 * invisible here until the entry went stale.
 */
describe('the cache entries « Mes chantiers » reads', () => {
  it('reads the plan from the planning feature’s entry', async () => {
    const { result } = renderHook(() => usePlan('ws'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData(planKey('ws'))).toEqual({ tasks: [] });
  });

  it('keeps the bookings and the workers under their owners’ keys', async () => {
    renderHook(() => [useAssignments('ws', true), useActiveWorkers(true)], { wrapper });
    await waitFor(() => expect(mock.history.get).toHaveLength(2));
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // What the equipment and workers features invalidate after a change.
    expect(client.getQueryCache().findAll({ queryKey: equipmentKeys.assignments() })).toHaveLength(1);
    expect(client.getQueryCache().findAll({ queryKey: workerKeys.all })).toHaveLength(1);
  });
});
