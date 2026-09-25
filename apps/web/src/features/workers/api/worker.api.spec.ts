import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '@/shared/api/http-client';
import { createWorker, deleteWorker, fetchWorkers, updateWorker } from './worker.api';
import { workerKeys } from './worker.keys';

/**
 * The four calls, and the query string / body they build.
 *
 * Worth pinning because a filter that silently does not travel looks exactly
 * like a filter that matched everything: the screen shows all the rows and
 * nobody suspects the URL. Same reasoning as `invitation.api.spec.ts`.
 */

let mock: MockAdapter;

/** Handlers only ever add — the first one registered always wins — so a fresh reply means a fresh mock. */
function mockReply(status: number, body?: unknown): void {
  mock.reset();
  mock.onAny().reply(status, body);
}

beforeEach(() => {
  mock = new MockAdapter(apiClient);
  mockReply(200, { items: [], total: 0, page: 1, limit: 20 });
});

afterEach(() => {
  mock.restore();
});

function url(): string {
  return mock.history.get[0]?.url ?? '';
}

describe('fetchWorkers', () => {
  it('sends no content type — a GET carries nothing', async () => {
    await fetchWorkers();

    expect(mock.history.get[0]?.headers?.['Content-Type']).toBeFalsy();
  });

  it('asks for the plain list when nothing is filtered', async () => {
    await fetchWorkers();

    expect(url()).toMatch(/\/workers$/);
  });

  it('carries the filters it was given, active included', async () => {
    await fetchWorkers({ search: 'Benali', active: true, page: 2 });

    const query = new URL(url(), 'http://localhost').searchParams;
    expect(query.get('search')).toBe('Benali');
    expect(query.get('active')).toBe('true');
    expect(query.get('page')).toBe('2');
  });

  it('tells `active: false` apart from "not filtered" — both are meaningful', async () => {
    await fetchWorkers({ active: false });

    expect(new URL(url(), 'http://localhost').searchParams.get('active')).toBe('false');
  });

  it('drops a blank search instead of sending an empty filter', async () => {
    await fetchWorkers({ search: '   ' });

    expect(url()).toMatch(/\/workers$/);
  });

  it('trims the search it sends', async () => {
    await fetchWorkers({ search: '  Karim ' });

    expect(new URL(url(), 'http://localhost').searchParams.get('search')).toBe('Karim');
  });
});

describe('createWorker and updateWorker', () => {
  it('creates with a POST and a JSON body', async () => {
    mockReply(200, { id: 'w-1' });

    await createWorker({ name: 'Karim Benali', hourlyRate: 18.5 });

    const request = mock.history.post[0];
    expect(request?.url).toMatch(/\/workers$/);
    expect(JSON.parse(request?.data as string)).toEqual({ name: 'Karim Benali', hourlyRate: 18.5 });
  });

  it('edits with a PATCH on the worker’s own id', async () => {
    mockReply(200, { id: 'w-1' });

    await updateWorker('w-1', { active: false });

    const request = mock.history.patch[0];
    expect(request?.url).toMatch(/\/workers\/w-1$/);
    expect(JSON.parse(request?.data as string)).toEqual({ active: false });
  });
});

describe('deleteWorker', () => {
  /**
   * Same header regression as invitations: a DELETE carries no body, and
   * announcing JSON without one is a 400 on the API's own framework.
   */
  it('announces no content type — there is nothing to describe', async () => {
    mockReply(204);

    await deleteWorker('w-1');

    expect(mock.history.delete[0]?.headers?.['Content-Type']).toBeFalsy();
  });

  it('deletes with a DELETE, and survives the empty 204 body', async () => {
    mockReply(204);

    await expect(deleteWorker('w-1')).resolves.toBeUndefined();

    const request = mock.history.delete[0];
    expect(request?.url).toMatch(/\/workers\/w-1$/);
  });
});

describe('workerKeys', () => {
  it('nests, so invalidating `all` reaches every filtered list', () => {
    expect(workerKeys.list({ search: 'a' })[0]).toBe(workerKeys.all[0]);
    expect(workerKeys.list()).toEqual(['workers', 'list', {}]);
  });

  it('gives each filter combination its own entry', () => {
    expect(workerKeys.list({ active: true })).not.toEqual(workerKeys.list({ active: false }));
  });
});
