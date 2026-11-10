import { NextResponse } from 'next/server';
import { REFRESH_MAX_AGE, callApi, type AuthSession } from '@/shared/api/api-server';
import { setRefreshToken } from '@/shared/api/session-cookie';

/**
 * « Essayer la démo », from the showcase: opens a session on the public
 * demonstration's account and lands on its worksites.
 *
 * No password travels: the API opens the session itself, and only for that
 * account. The refresh token goes to the httpOnly cookie, as on a real sign-in,
 * and the page rebuilds the session from it on load. With no demonstration on
 * this deployment, the visitor ends up on the sign-in page.
 */
export async function GET(): Promise<NextResponse> {
  try {
    // An empty JSON body, not none: `callApi` sends a JSON content type, and the
    // API refuses that header on an empty request.
    const session = await callApi<AuthSession>('/auth/demo', { method: 'POST', body: '{}' });
    await setRefreshToken(session.refreshToken, REFRESH_MAX_AGE);
    return goTo('/');
  } catch {
    return goTo('/login');
  }
}

/**
 * A relative redirect: the browser stays on the host it asked, which is the
 * one the session cookie was set for. An absolute URL built from the request
 * can name another (a proxy's, `localhost` for `127.0.0.1`), and lose it.
 */
function goTo(path: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}
