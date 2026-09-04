import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiClient,
  apiFetch,
  authClient,
  authFetch,
  setAccessToken,
  setSessionRefresher,
} from './http-client';

/**
 * The one file every call goes through, and the one that had almost no tests.
 *
 * That gap has a name now: `Content-Type: application/json` went out on every
 * request, body or no body, and Fastify refuses a request that announces JSON
 * and carries nothing. Both invitation actions answered 400 in production while
 * the list beside them worked — and the suite stayed green, because a mocked
 * `fetch` has no opinion about headers.
 *
 * The rest is the behaviour the session depends on: the token travels, a 401
 * refreshes **once**, and a failed refresh does not loop.
 */

let apiMock: MockAdapter;
let authMock: MockAdapter;

beforeEach(() => {
  apiMock = new MockAdapter(apiClient);
  authMock = new MockAdapter(authClient);
  setAccessToken(null);
  setSessionRefresher(null);
});

afterEach(() => {
  apiMock.restore();
  authMock.restore();
});

describe('apiFetch headers', () => {
  it('announces JSON only when it sends JSON', async () => {
    apiMock.onPost('/worksites').reply((config) => {
      expect(config.headers?.['Content-Type']).toBe('application/json');
      return [200, { ok: true }];
    });

    await apiFetch('/worksites', { method: 'POST', data: { code: 'A7' } });
  });

  it('sends no content type on a request with no body', async () => {
    apiMock.onPost('/invitations/inv-1/resend').reply((config) => {
      expect(config.headers?.['Content-Type']).toBeFalsy();
      return [200, { ok: true }];
    });
    apiMock.onDelete('/invitations/inv-1').reply((config) => {
      expect(config.headers?.['Content-Type']).toBeFalsy();
      return [200, { ok: true }];
    });
    apiMock.onGet('/invitations').reply((config) => {
      // Fastify: `400 Body cannot be empty when content-type is set to
      // 'application/json'`. This is the assertion the production bug was missing.
      expect(config.headers?.['Content-Type']).toBeFalsy();
      return [200, { ok: true }];
    });

    await apiFetch('/invitations/inv-1/resend', { method: 'POST' });
    await apiFetch('/invitations/inv-1', { method: 'DELETE' });
    await apiFetch('/invitations');
  });

  it('carries the access token when there is one, and nothing when there is not', async () => {
    apiMock.onGet('/worksites').reply((config) => {
      expect(config.headers?.Authorization).toBeUndefined();
      return [200, { ok: true }];
    });
    await apiFetch('/worksites');

    setAccessToken('jeton-abc');
    apiMock.onGet('/worksites').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer jeton-abc');
      return [200, { ok: true }];
    });
    await apiFetch('/worksites');
  });

  it('lets a caller override a header it set', async () => {
    apiMock.onGet('/worksites').reply((config) => {
      expect(config.headers?.['Content-Type']).toBe('text/plain');
      return [200, { ok: true }];
    });

    await apiFetch('/worksites', { headers: { 'Content-Type': 'text/plain' } });
  });
});

describe('apiFetch failures', () => {
  it('raises an ApiError carrying the status and the API’s message', async () => {
    apiMock.onGet('/worksites/x').reply(404, { message: 'Chantier introuvable' });

    await expect(apiFetch('/worksites/x')).rejects.toMatchObject({
      status: 404,
      message: 'Chantier introuvable',
    });
  });

  it('keeps the per-field errors, so a form can mark every unmet rule at once', async () => {
    apiMock.onPost('/auth/register').reply(400, {
      message: 'Invalide',
      errors: [{ field: 'password', code: 'minLength', message: 'trop court' }],
    });

    const caught = await apiFetch('/auth/register', { method: 'POST', data: {} }).catch(
      (e: unknown) => e,
    );

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).fields).toHaveLength(1);
  });

  it('survives a body that is not JSON at all', async () => {
    apiMock.onGet('/worksites').reply(502, '<html>502</html>');

    await expect(apiFetch('/worksites')).rejects.toMatchObject({ status: 502 });
  });
});

describe('apiFetch and the expired session', () => {
  it('refreshes once on a 401, then retries', async () => {
    const refresh = vi.fn(async () => 'jeton-neuf');
    setSessionRefresher(refresh);
    apiMock
      .onGet('/worksites')
      .replyOnce(401, { message: 'expiré' })
      .onGet('/worksites')
      .replyOnce(200, { ok: true });

    await expect(apiFetch('/worksites')).resolves.toEqual({ ok: true });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(apiMock.history.get).toHaveLength(2);
  });

  it('gives up after the second 401 instead of looping', async () => {
    const refresh = vi.fn(async () => 'jeton-neuf');
    setSessionRefresher(refresh);
    apiMock.onGet('/worksites').reply(401, { message: 'expiré' });

    await expect(apiFetch('/worksites')).rejects.toMatchObject({ status: 401 });

    // Twice, never more: an expired session must not become a burst of requests.
    expect(apiMock.history.get).toHaveLength(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not retry when the refresh itself comes back empty', async () => {
    setSessionRefresher(vi.fn(async () => null));
    apiMock.onGet('/worksites').reply(401, { message: 'expiré' });

    await expect(apiFetch('/worksites')).rejects.toMatchObject({ status: 401 });
    expect(apiMock.history.get).toHaveLength(1);
  });

  it('does not try to refresh when nothing can refresh', async () => {
    apiMock.onGet('/worksites').reply(401, { message: 'expiré' });

    await expect(apiFetch('/worksites')).rejects.toMatchObject({ status: 401 });
    expect(apiMock.history.get).toHaveLength(1);
  });
});

describe('authFetch', () => {
  it('posts to Next’s own handlers and sends the cookie', async () => {
    authMock.onPost('/login').reply((config) => {
      expect(config.withCredentials).toBe(true);
      expect(JSON.parse(config.data as string)).toEqual({ email: 'a@b.fr', password: 'x' });
      return [200, { ok: true }];
    });

    await authFetch('login', { email: 'a@b.fr', password: 'x' });

    expect(authMock.history.post).toHaveLength(1);
  });

  it('sends no body when there is nothing to send', async () => {
    authMock.onPost('/refresh').reply((config) => {
      expect(config.data).toBeUndefined();
      return [200, { ok: true }];
    });

    await authFetch('refresh');
  });
});
