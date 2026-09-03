import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiFetch,
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

let fetchMock: ReturnType<typeof vi.fn>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function headersOf(call: number): Record<string, string> {
  return (fetchMock.mock.calls[call][1] as RequestInit).headers as Record<string, string>;
}

beforeEach(() => {
  fetchMock = vi.fn(async () => json({ ok: true }));
  vi.stubGlobal('fetch', fetchMock);
  setAccessToken(null);
  setSessionRefresher(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch headers', () => {
  it('announces JSON only when it sends JSON', async () => {
    await apiFetch('/worksites', { method: 'POST', body: JSON.stringify({ code: 'A7' }) });

    expect(headersOf(0)['Content-Type']).toBe('application/json');
  });

  it('sends no content type on a request with no body', async () => {
    await apiFetch('/invitations/inv-1/resend', { method: 'POST' });
    await apiFetch('/invitations/inv-1', { method: 'DELETE' });
    await apiFetch('/invitations');

    // Fastify: `400 Body cannot be empty when content-type is set to
    // 'application/json'`. This is the assertion the production bug was missing.
    expect(headersOf(0)['Content-Type']).toBeUndefined();
    expect(headersOf(1)['Content-Type']).toBeUndefined();
    expect(headersOf(2)['Content-Type']).toBeUndefined();
  });

  it('carries the access token when there is one, and nothing when there is not', async () => {
    await apiFetch('/worksites');
    expect(headersOf(0).Authorization).toBeUndefined();

    setAccessToken('jeton-abc');
    await apiFetch('/worksites');
    expect(headersOf(1).Authorization).toBe('Bearer jeton-abc');
  });

  it('lets a caller override a header it set', async () => {
    await apiFetch('/worksites', { headers: { 'Content-Type': 'text/plain' } });

    expect(headersOf(0)['Content-Type']).toBe('text/plain');
  });
});

describe('apiFetch failures', () => {
  it('raises an ApiError carrying the status and the API’s message', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Chantier introuvable' }, 404));

    await expect(apiFetch('/worksites/x')).rejects.toMatchObject({
      status: 404,
      message: 'Chantier introuvable',
    });
  });

  it('keeps the per-field errors, so a form can mark every unmet rule at once', async () => {
    fetchMock.mockResolvedValue(
      json({ message: 'Invalide', errors: [{ field: 'password', code: 'minLength', message: 'trop court' }] }, 400),
    );

    const caught = await apiFetch('/auth/register', { method: 'POST', body: '{}' }).catch((e: unknown) => e);

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).fields).toHaveLength(1);
  });

  it('survives a body that is not JSON at all', async () => {
    fetchMock.mockResolvedValue(new Response('<html>502</html>', { status: 502 }));

    await expect(apiFetch('/worksites')).rejects.toMatchObject({ status: 502 });
  });
});

describe('apiFetch and the expired session', () => {
  it('refreshes once on a 401, then retries', async () => {
    const refresh = vi.fn(async () => 'jeton-neuf');
    setSessionRefresher(refresh);
    fetchMock.mockResolvedValueOnce(json({ message: 'expiré' }, 401));

    await expect(apiFetch('/worksites')).resolves.toEqual({ ok: true });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after the second 401 instead of looping', async () => {
    const refresh = vi.fn(async () => 'jeton-neuf');
    setSessionRefresher(refresh);
    fetchMock.mockResolvedValue(json({ message: 'expiré' }, 401));

    await expect(apiFetch('/worksites')).rejects.toMatchObject({ status: 401 });

    // Twice, never more: an expired session must not become a burst of requests.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not retry when the refresh itself comes back empty', async () => {
    setSessionRefresher(vi.fn(async () => null));
    fetchMock.mockResolvedValue(json({ message: 'expiré' }, 401));

    await expect(apiFetch('/worksites')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not try to refresh when nothing can refresh', async () => {
    fetchMock.mockResolvedValue(json({ message: 'expiré' }, 401));

    await expect(apiFetch('/worksites')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('authFetch', () => {
  it('posts to Next’s own handlers and sends the cookie', async () => {
    await authFetch('login', { email: 'a@b.fr', password: 'x' });

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
    // The refresh token lives in an httpOnly cookie; without it the handler has
    // nothing to work with.
    expect(init.credentials).toBe('same-origin');
  });

  it('sends no body when there is nothing to send', async () => {
    await authFetch('refresh');

    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBeUndefined();
  });
});
