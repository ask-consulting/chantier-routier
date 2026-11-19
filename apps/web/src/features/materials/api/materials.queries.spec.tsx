import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '@/shared/api/http-client';
import { materialKeys, useOwnMaterialChanges } from './materials.queries';

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

describe('changing an own material', () => {
  it('refreshes the list, and the planned needs that show its name — not the catalog', async () => {
    mock.onPatch('/materials/m').reply(200, {});
    client.setQueryData(materialKeys.catalog(), []);
    client.setQueryData(materialKeys.own(), []);
    client.setQueryData(materialKeys.needs('ws'), []);
    const { result } = renderHook(() => useOwnMaterialChanges(), { wrapper });

    await act(() => result.current.update.mutateAsync({ id: 'm', data: { label: 'Tuf' } }));

    expect(client.getQueryState(materialKeys.own())?.isInvalidated).toBe(true);
    expect(client.getQueryState(materialKeys.needs('ws'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(materialKeys.catalog())?.isInvalidated).toBe(false);
  });
});
