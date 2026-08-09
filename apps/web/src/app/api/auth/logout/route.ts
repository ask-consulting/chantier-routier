import { NextResponse } from 'next/server';
import { callApi } from '@/shared/api/api-server';
import { clearRefreshToken, readRefreshToken } from '@/shared/api/session-cookie';

/**
 * Ends the session on both sides.
 *
 * The cookie is cleared whatever the API answers: a browser that has decided to
 * log out must end up logged out, even if the network is down. The API call is
 * what actually revokes the token server-side, so it is attempted first.
 */
export async function POST(): Promise<NextResponse> {
  const refreshToken = await readRefreshToken();

  if (refreshToken) {
    await callApi('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      headers: {},
    }).catch(() => undefined);
  }

  await clearRefreshToken();
  return new NextResponse(null, { status: 204 });
}
