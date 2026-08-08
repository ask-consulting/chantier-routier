import { NextResponse } from 'next/server';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from '@/i18n/config';
import { ApiCallError, REFRESH_MAX_AGE, callApi, type AuthSession } from '@/lib/api-server';
import { setRefreshToken } from '@/lib/session-cookie';

/**
 * Signs in, and keeps the refresh token where the page cannot reach it.
 *
 * The browser gets the access token — five minutes, held in memory — and the
 * profile. The refresh token stays in an httpOnly cookie, so an injected script
 * could steal a session for five minutes rather than thirty days.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const credentials = (await request.json()) as { email: string; password: string };

  try {
    const session = await callApi<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    await setRefreshToken(session.refreshToken, REFRESH_MAX_AGE);

    const response = NextResponse.json({
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      user: session.user,
    });

    // The interface follows the account, not the browser: somebody who set their
    // language on a desktop finds it again on a phone. Written here so the very
    // first render after signing in is already in the right language.
    if (isLocale(session.user.locale)) {
      response.cookies.set(LOCALE_COOKIE, session.user.locale, {
        maxAge: LOCALE_COOKIE_MAX_AGE,
        path: '/',
        sameSite: 'lax',
      });
    }

    return response;
  } catch (error) {
    if (error instanceof ApiCallError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    throw error;
  }
}
