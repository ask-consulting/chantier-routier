'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale, type Locale } from './config';

/**
 * Stores the language preference and re-renders.
 *
 * A server action rather than a client-side cookie write: the locale is read on
 * the server to pick the message bundle, so it has to be set *before* the next
 * render rather than after it. Writing it from the browser would leave the
 * current page in the old language until something else happened to refresh it.
 *
 * `revalidatePath('/', 'layout')` clears the whole tree — every rendered string
 * depends on this value, not just the current page.
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) {
    return;
  }

  (await cookies()).set(LOCALE_COOKIE, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  });

  revalidatePath('/', 'layout');
}
