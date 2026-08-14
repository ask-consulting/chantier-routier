import { NextResponse } from 'next/server';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from '@/shared/i18n/config';
import { ApiCallError, REFRESH_MAX_AGE, callApi, type AuthSession } from '@/shared/api/api-server';
import { setRefreshToken } from '@/shared/api/session-cookie';

/**
 * Sets a password from an invitation link and opens the session.
 *
 * Same shape as login, because the API answers the same way: somebody who has
 * just chosen a password is signed in rather than sent to a form to type it
 * again.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const payload = (await request.json()) as { token: string; password: string };

  try {
    const session = await callApi<AuthSession>('/auth/accept-invitation', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await setRefreshToken(session.refreshToken, REFRESH_MAX_AGE);

    const response = NextResponse.json({
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      user: session.user,
    });

    // The invitation carried a language chosen by whoever sent it; honour it
    // from the first screen the invitee sees.
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
