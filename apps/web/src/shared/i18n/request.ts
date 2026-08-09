import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from './config';

/**
 * Resolves the locale for a server render.
 *
 * The cookie is validated rather than trusted: it is user-controlled, and an
 * unchecked value would end up in a dynamic `import()` path.
 */
export default getRequestConfig(async () => {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(stored) ? stored : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../../messages/${locale}.json`)).default,
  };
});
