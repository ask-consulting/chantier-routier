import { NextResponse } from 'next/server';
import { ApiCallError, REFRESH_MAX_AGE, callApi, type AuthSession } from '@/shared/api/api-server';
import { clearRefreshToken, readRefreshToken, setRefreshToken } from '@/shared/api/session-cookie';

/**
 * Trades the stored refresh token for a new access token.
 *
 * Called on page load — the access token lives in memory and does not survive a
 * reload — and whenever an API call comes back 401.
 *
 * The API rotates on every refresh, so the new token replaces the old in the
 * cookie. On failure the cookie is cleared rather than left behind: a token the
 * API has rejected is only going to fail again, and keeping it would make every
 * page load carry a doomed round-trip.
 */
export async function POST(): Promise<NextResponse> {
  const refreshToken = await readRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ message: 'Aucune session', statusCode: 401 }, { status: 401 });
  }

  try {
    const session = await callApi<AuthSession>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    await setRefreshToken(session.refreshToken, REFRESH_MAX_AGE);

    return NextResponse.json({
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      user: session.user,
    });
  } catch (error) {
    await clearRefreshToken();
    if (error instanceof ApiCallError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    throw error;
  }
}
