import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/http-client';
import { useLoginForm } from './use-login-form';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const session = vi.hoisted(() => ({
  user: null as { id: string } | null,
  loading: false,
  signIn: vi.fn(async (_email: string, _password: string) => {}),
}));
vi.mock('./session-provider', () => ({ useSession: () => session }));

/**
 * The sign-in screen's decisions, without drawing it.
 *
 * What matters here is not the two fields — it is that the hook preserves a
 * property the API went out of its way to establish: a wrong password and an
 * unknown address are indistinguishable. A front that separates them hands back
 * the enumeration oracle the back end refused to give (see the API's own
 * `auth-flow.spec.ts`).
 */

const SUBMIT = { preventDefault: vi.fn() } as unknown as React.FormEvent;

beforeEach(() => {
  vi.clearAllMocks();
  session.user = null;
  session.loading = false;
  session.signIn.mockResolvedValue(undefined);
});

describe('useLoginForm', () => {
  it('starts blank, idle and silent', () => {
    const { result } = renderHook(() => useLoginForm());

    expect(result.current.email).toBe('');
    expect(result.current.password).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBe(false);
  });

  it('hands the typed credentials to the session', async () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => result.current.setEmail('chef@chantier.fr'));
    act(() => result.current.setPassword('Correct-Horse-42!'));
    await act(async () => await result.current.submit(SUBMIT));

    expect(session.signIn).toHaveBeenCalledWith('chef@chantier.fr', 'Correct-Horse-42!');
  });

  /**
   * The API answers 401 for both, deliberately. Mapping them to one key is what
   * keeps that true on screen — anything finer here would leak which addresses
   * exist.
   */
  it.each([
    ['a wrong password', new ApiError(401, 'Invalid credentials')],
    ['an unknown address', new ApiError(401, 'Invalid credentials')],
    ['something unexpected', new Error('network down')],
  ])('says only "invalid credentials" for %s', async (_label, thrown) => {
    session.signIn.mockRejectedValue(thrown);
    const { result } = renderHook(() => useLoginForm());

    await act(async () => await result.current.submit(SUBMIT));

    expect(result.current.error).toBe('invalidCredentials');
  });

  /**
   * A disabled account is the one case told apart, because retrying cannot fix
   * it — the person needs to be told to call someone. The API only ever answers
   * 403 there once the password has already been proved right.
   */
  it('tells a disabled account apart, and only on 403', async () => {
    session.signIn.mockRejectedValue(new ApiError(403, 'Account disabled'));
    const { result } = renderHook(() => useLoginForm());

    await act(async () => await result.current.submit(SUBMIT));

    expect(result.current.error).toBe('disabled');
  });

  it('lets the button come back after a refusal', async () => {
    session.signIn.mockRejectedValue(new ApiError(401, 'nope'));
    const { result } = renderHook(() => useLoginForm());

    await act(async () => await result.current.submit(SUBMIT));

    expect(result.current.pending).toBe(false);
  });

  /**
   * No `setPending(false)` on success: `signIn` navigates away, and clearing the
   * flag would flash an enabled button over a page that is already leaving.
   */
  it('keeps the button down on success, because the page is leaving', async () => {
    const { result } = renderHook(() => useLoginForm());

    await act(async () => await result.current.submit(SUBMIT));

    expect(result.current.pending).toBe(true);
  });

  it('clears the previous error before trying again', async () => {
    session.signIn.mockRejectedValueOnce(new ApiError(401, 'nope'));
    const { result } = renderHook(() => useLoginForm());
    await act(async () => await result.current.submit(SUBMIT));
    expect(result.current.error).toBe('invalidCredentials');

    session.signIn.mockResolvedValue(undefined);
    await act(async () => await result.current.submit(SUBMIT));

    expect(result.current.error).toBeNull();
  });

  it('sends somebody already signed in away from this page', async () => {
    session.user = { id: 'user-1' };
    renderHook(() => useLoginForm());

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/worksites'));
  });

  /**
   * `loading` means the session is still being rebuilt from the cookie. Acting
   * on a not-yet-known user would bounce a signed-in person onto the login form
   * for a frame, then bounce them back.
   */
  it('waits for the session before deciding anybody is a stranger', () => {
    session.loading = true;
    session.user = null;
    renderHook(() => useLoginForm());

    expect(replace).not.toHaveBeenCalled();
  });

  it('leaves a signed-out visitor where they are', () => {
    renderHook(() => useLoginForm());

    expect(replace).not.toHaveBeenCalled();
  });
});
