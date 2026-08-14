import type { IInvitationPreview, IUser } from '@chantia/shared';
import { apiFetch, authFetch } from '@/shared/api/http-client';

/**
 * The authentication endpoints, in one place.
 *
 * Two destinations, and the split is the security model:
 *
 *   - `authFetch` reaches **Next's own handlers**, which hold the refresh token
 *     in an httpOnly cookie. The browser never sees that token, so a script that
 *     manages to run on the page cannot steal a thirty-day credential.
 *   - `apiFetch` reaches the Nest API directly, carrying the five-minute access
 *     token. `previewInvitation` is the exception that needs neither: the token
 *     in the URL *is* the credential.
 */

export interface SessionResponse {
  accessToken: string;
  expiresIn: number;
  user: IUser;
}

export function signIn(email: string, password: string): Promise<SessionResponse> {
  return authFetch<SessionResponse>('login', { email, password });
}

export function acceptInvitation(token: string, password: string): Promise<SessionResponse> {
  return authFetch<SessionResponse>('accept-invitation', { token, password });
}

export function refreshSession(): Promise<SessionResponse> {
  return authFetch<SessionResponse>('refresh');
}

export function signOut(): Promise<void> {
  return authFetch<void>('logout');
}

/**
 * Who an invitation is for, before anyone types a password.
 *
 * Public by design — it lets the page greet the invitee by name and fail early
 * on a dead link, instead of showing an anonymous form that only rejects after a
 * password has been entered twice. It returns a first name and an organisation,
 * never an email or a role.
 */
export function previewInvitation(token: string): Promise<IInvitationPreview> {
  return apiFetch<IInvitationPreview>(`/auth/invitation/${token}`);
}
