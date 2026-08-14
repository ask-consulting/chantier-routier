import { cookies } from 'next/headers';

/**
 * The refresh token, kept in an httpOnly cookie that browser JavaScript cannot
 * read.
 *
 * The API hands the refresh token back in a JSON body, which is the right thing
 * for a mobile client but the wrong thing for a browser: anything the page's
 * JavaScript can read, an injected script can read too — and a refresh token is
 * worth thirty days of session.
 *
 * So Next stands in the middle. The route handlers under `/api/auth` call the
 * API, keep the refresh token here, and return only the short-lived access token
 * to the page. An XSS flaw could then steal five minutes, not a month.
 */

export const REFRESH_COOKIE = 'chantia.refresh';

export async function setRefreshToken(token: string, maxAgeSeconds: number): Promise<void> {
  (await cookies()).set(REFRESH_COOKIE, token, {
    httpOnly: true,
    // Lax rather than Strict: Strict would drop the cookie when arriving from an
    // invitation link in a mail client, which is exactly how invitees arrive.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export async function readRefreshToken(): Promise<string | null> {
  return (await cookies()).get(REFRESH_COOKIE)?.value ?? null;
}

export async function clearRefreshToken(): Promise<void> {
  (await cookies()).delete(REFRESH_COOKIE);
}
