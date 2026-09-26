import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WorksiteStatus } from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { fetchWorksite, fetchWorksites } from './worksite.api';
import { worksiteKeys } from './worksite.keys';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient);
  mock.onAny().reply(200, { items: [], total: 0, page: 1, limit: 20 });
});

afterEach(() => mock.restore());

describe('fetchWorksites', () => {
  it('sends only what is set, the search trimmed', async () => {
    await fetchWorksites({ page: 2, limit: 50, search: '  sousse ', status: WorksiteStatus.COMPLETED });

    expect(mock.history.get[0]?.url).toBe('/worksites?page=2&limit=50&search=sousse&status=completed');
  });

  it('drops a blank search rather than filter on nothing', async () => {
    await fetchWorksites({ search: '   ' });

    expect(mock.history.get[0]?.url).toBe('/worksites');
  });
});

describe('fetchWorksite', () => {
  it('reads one by id', async () => {
    await fetchWorksite('worksite-1');

    expect(mock.history.get[0]?.url).toBe('/worksites/worksite-1');
  });
});

describe('worksiteKeys', () => {
  it('nests details under the same root as lists, so one invalidation reaches both', () => {
    expect(worksiteKeys.detail('w-1').slice(0, 1)).toEqual(worksiteKeys.all);
    expect(worksiteKeys.list().slice(0, 1)).toEqual(worksiteKeys.all);
  });
});
