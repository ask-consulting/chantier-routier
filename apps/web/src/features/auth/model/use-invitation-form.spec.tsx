import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/http-client';
import { useInvitationForm } from './use-invitation-form';

const previewInvitation = vi.hoisted(() => vi.fn());
vi.mock('../api/auth.api', () => ({ previewInvitation }));

const session = vi.hoisted(() => ({
  acceptInvitation: vi.fn(async (_token: string, _password: string) => {}),
}));
vi.mock('./session-provider', () => ({ useSession: () => session }));

/**
 * The invitation screen's decisions.
 *
 * Two properties are load-bearing and neither is visible in a screenshot: the
 * hook returns message *keys* rather than sentences — so a server message in
 * English never lands on an Arabic screen — and it surfaces every unmet password
 * rule at once, which is the whole reason the API sends them together.
 */

const PREVIEW = { firstName: 'Amine', lastName: 'Ben Salah', email: 'chef@chantier.fr' };
const SUBMIT = { preventDefault: vi.fn() } as unknown as React.FormEvent;

beforeEach(() => {
  vi.clearAllMocks();
  previewInvitation.mockResolvedValue(PREVIEW);
  session.acceptInvitation.mockResolvedValue(undefined);
});

describe('the preview', () => {
  it('greets the invitee by name once the link checks out', async () => {
    const { result } = renderHook(() => useInvitationForm('welcome'));

    await waitFor(() => expect(result.current.preview).toEqual(PREVIEW));
    expect(result.current.invalid).toBe(false);
  });

  /**
   * Failing early is the point: the alternative is an anonymous form that only
   * rejects after a password has been typed twice.
   */
  it('marks a dead link before anything is typed', async () => {
    previewInvitation.mockRejectedValue(new ApiError(401, 'Invalid invitation'));
    const { result } = renderHook(() => useInvitationForm('stale'));

    await waitFor(() => expect(result.current.invalid).toBe(true));
    expect(result.current.preview).toBeNull();
  });

  /**
   * A late answer to a token we have moved on from must not overwrite the
   * current one. Without the abandoned flag the screen would show the previous
   * invitee's name.
   */
  it('ignores an answer that arrives after the token changed', async () => {
    let settleFirst: (value: unknown) => void = () => {};
    previewInvitation.mockReturnValueOnce(new Promise((resolve) => (settleFirst = resolve)));
    previewInvitation.mockResolvedValueOnce({ ...PREVIEW, firstName: 'Yasmine' });

    const { result, rerender } = renderHook(({ token }) => useInvitationForm(token), {
      initialProps: { token: 'first' },
    });
    rerender({ token: 'second' });
    await waitFor(() => expect(result.current.preview?.firstName).toBe('Yasmine'));

    await act(async () => settleFirst({ ...PREVIEW, firstName: 'Amine' }));

    expect(result.current.preview?.firstName).toBe('Yasmine');
  });
});

describe('submitting', () => {
  it('activates the account with the chosen password', async () => {
    const { result } = renderHook(() => useInvitationForm('welcome'));

    act(() => result.current.setPassword('Correct-Horse-42!'));
    act(() => result.current.setConfirmation('Correct-Horse-42!'));
    await act(async () => await result.current.submit(SUBMIT));

    expect(session.acceptInvitation).toHaveBeenCalledWith('welcome', 'Correct-Horse-42!');
  });

  /** Caught here, so a typo never costs a round-trip nor burns the link. */
  it('catches a mistyped confirmation without calling the API', async () => {
    const { result } = renderHook(() => useInvitationForm('welcome'));

    act(() => result.current.setPassword('Correct-Horse-42!'));
    act(() => result.current.setConfirmation('Correct-Horse-43!'));
    await act(async () => await result.current.submit(SUBMIT));

    expect(session.acceptInvitation).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual([{ kind: 'form', key: 'mismatch' }]);
  });

  /**
   * The API returns every unmet rule at once so the person fixes their password
   * in one attempt. Keeping them all is what makes that worth doing.
   */
  it('surfaces every unmet password rule together', async () => {
    session.acceptInvitation.mockRejectedValue(
      new ApiError(400, 'Password does not meet the security policy', [
        { field: 'password', code: 'form.errors.password.minLength', message: 'too short' },
        { field: 'password', code: 'form.errors.password.uppercase', message: 'needs uppercase' },
      ]),
    );
    const { result } = renderHook(() => useInvitationForm('welcome'));

    await act(async () => await result.current.submit(SUBMIT));

    expect(result.current.errors).toEqual([
      { kind: 'passwordRule', code: 'minLength' },
      { kind: 'passwordRule', code: 'uppercase' },
    ]);
  });

  /**
   * Only the last segment names the rule; the component owns the namespace it
   * lives under. Passing the whole key through would make the component look up
   * `form.errors.password.form.errors.password.minLength`.
   */
  it('keeps only the segment that names the rule', async () => {
    session.acceptInvitation.mockRejectedValue(
      new ApiError(400, 'nope', [
        { field: 'password', code: 'form.errors.password.common', message: 'too common' },
      ]),
    );
    const { result } = renderHook(() => useInvitationForm('welcome'));

    await act(async () => await result.current.submit(SUBMIT));

    expect(result.current.errors).toEqual([{ kind: 'passwordRule', code: 'common' }]);
  });

  /**
   * Anything we cannot map falls back to `expired`, which is what an unusable
   * link is. The alternative — showing the server's message — puts an English
   * sentence on an Arabic screen.
   */
  it.each([
    ['a refusal carrying no field', new ApiError(401, 'Invalid invitation')],
    ['a refusal with an empty field list', new ApiError(400, 'nope', [])],
    ['a network failure', new Error('offline')],
  ])('falls back to "expired" on %s', async (_label, thrown) => {
    session.acceptInvitation.mockRejectedValue(thrown);
    const { result } = renderHook(() => useInvitationForm('welcome'));

    await act(async () => await result.current.submit(SUBMIT));

    expect(result.current.errors).toEqual([{ kind: 'form', key: 'expired' }]);
  });

  it('lets the invitee try again after a refusal', async () => {
    session.acceptInvitation.mockRejectedValueOnce(new ApiError(400, 'nope', []));
    const { result } = renderHook(() => useInvitationForm('welcome'));
    await act(async () => await result.current.submit(SUBMIT));
    expect(result.current.pending).toBe(false);

    await act(async () => await result.current.submit(SUBMIT));

    expect(result.current.errors).toEqual([]);
  });
});
