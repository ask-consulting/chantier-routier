import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // Transpile the shared workspace package (types, enums, business calcs).
  transpilePackages: ['@chantia/shared'],
};

/** Points the plugin at our config, which resolves the locale from a cookie. */
const withNextIntl = createNextIntlPlugin('./src/shared/i18n/request.ts');

/**
 * The service worker, built from `src/app/sw.ts` into `public/sw.js` (ignored
 * by git — it is a build output). See `sw.ts` for what it caches, and why
 * never the API.
 *
 * Off in development: a worker caching the shell would serve yesterday's
 * build under `next dev`'s hot reload, and every change would look ignored.
 */
const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  // The offline page, cached at install — it has to be there before the
  // network goes, which is when it is needed. Its revision follows each build.
  additionalPrecacheEntries: [{ url: '/offline', revision: String(Date.now()) }],
  // Back online: reload, so a page served from the fallback becomes the real one.
  reloadOnOnline: true,
});

export default withSerwist(withNextIntl(nextConfig));
