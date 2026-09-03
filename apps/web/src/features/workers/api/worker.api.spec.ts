import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorker, deleteWorker, fetchWorkers, updateWorker } from './worker.api';
import { workerKeys } from './worker.keys';

/**
 * The four calls, and the query string / body they build.
 *
 * Worth pinning because a filter that silently does not travel looks exactly
 * like a filter that matched everything: the screen shows all the rows and
 * nobody suspects the URL. Same reasoning as `invitation.api.spec.ts`.
 */

let fetchMock: ReturnType<typeof vi.fn>;

function ok(body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function url(): string {
  return String((fetchMock.mock.calls[0] as [string, RequestInit])[0]);
}

beforeEach(() => {
  fetchMock = vi.fn(async () => ok({ items: [], total: 0, page: 1, limit: 20 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchWorkers', () => {
  it('sends no content type — a GET carries nothing', async () => {
    await fetchWorkers();

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
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
    fetchMock.mockResolvedValue(ok({ id: 'w-1' }));

    await createWorker({ name: 'Karim Benali', hourlyRate: 18.5 });

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toMatch(/\/workers$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Karim Benali', hourlyRate: 18.5 });
  });

  it('edits with a PATCH on the worker’s own id', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'w-1' }));

    await updateWorker('w-1', { active: false });

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toMatch(/\/workers\/w-1$/);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ active: false });
  });
});

describe('deleteWorker', () => {
  /**
   * Same header regression as invitations: a DELETE carries no body, and
   * announcing JSON without one is a 400 on the API's own framework.
   */
  it('announces no content type — there is nothing to describe', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await deleteWorker('w-1');

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('deletes with a DELETE, and survives the empty 204 body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    // `apiFetch` cannot parse an empty body and falls back to `{}` rather than
    // throwing — the same behaviour `cancelInvitation` relies on.
    await expect(deleteWorker('w-1')).resolves.toBeDefined();

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toMatch(/\/workers\/w-1$/);
    expect(init.method).toBe('DELETE');
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
