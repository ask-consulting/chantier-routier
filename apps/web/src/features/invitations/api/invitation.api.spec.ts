import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitationStatus } from '@chantia/shared';
import { cancelInvitation, fetchInvitations, resendInvitation } from './invitation.api';
import { invitationKeys } from './invitation.keys';

/**
 * The three calls, and the query string they build.
 *
 * Worth pinning because a filter that silently does not travel looks exactly
 * like a filter that matched everything: the screen shows all the rows and
 * nobody suspects the URL.
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

describe('fetchInvitations', () => {
  it('sends no content type either — a GET carries nothing', async () => {
    await fetchInvitations();

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('asks for the plain list when nothing is filtered', async () => {
    await fetchInvitations();

    expect(url()).toMatch(/\/invitations$/);
  });

  it('carries the filters it was given', async () => {
    await fetchInvitations({ search: 'Benali', status: InvitationStatus.PENDING, page: 2 });

    const query = new URL(url(), 'http://localhost').searchParams;
    expect(query.get('search')).toBe('Benali');
    expect(query.get('status')).toBe(InvitationStatus.PENDING);
    expect(query.get('page')).toBe('2');
  });

  it('drops a blank search instead of sending an empty filter', async () => {
    await fetchInvitations({ search: '   ' });

    expect(url()).toMatch(/\/invitations$/);
  });

  it('trims the search it sends', async () => {
    await fetchInvitations({ search: '  Karim ' });

    expect(new URL(url(), 'http://localhost').searchParams.get('search')).toBe('Karim');
  });
});

describe('resendInvitation and cancelInvitation', () => {
  /**
   * The header is the whole test here.
   *
   * Both calls carry no body, and Fastify — which the API runs on — refuses a
   * request that announces JSON and carries nothing: `400 Body cannot be empty
   * when content-type is set to 'application/json'`. Both actions answered 400
   * in production while the list beside them worked, because a mocked `fetch`
   * has no opinion about headers and a `curl` written by hand does not send one.
   */
  it('announces no content type when there is no content', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await resendInvitation('inv-1');
    await cancelInvitation('inv-1');

    for (const call of fetchMock.mock.calls) {
      const headers = (call[1] as RequestInit).headers as Record<string, string>;
      expect(headers['Content-Type']).toBeUndefined();
    }
  });

  it('resends with a POST on the invitation', async () => {
    fetchMock.mockResolvedValue(ok({ invitationPath: '/invitation/x', expiresAt: 'x' }));

    await resendInvitation('inv-1');

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toMatch(/\/invitations\/inv-1\/resend$/);
    expect(init.method).toBe('POST');
  });

  it('cancels with a DELETE, and survives the empty 204 body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(cancelInvitation('inv-1')).resolves.toBeDefined();

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toMatch(/\/invitations\/inv-1$/);
    expect(init.method).toBe('DELETE');
  });
});

describe('invitationKeys', () => {
  it('nests, so invalidating `all` reaches every filtered list', () => {
    expect(invitationKeys.list({ search: 'a' })[0]).toBe(invitationKeys.all[0]);
    expect(invitationKeys.list()).toEqual(['invitations', 'list', {}]);
  });

  it('gives each filter combination its own entry', () => {
    expect(invitationKeys.list({ search: 'a' })).not.toEqual(invitationKeys.list({ search: 'b' }));
  });
});
