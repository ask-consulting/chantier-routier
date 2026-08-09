import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // Transpile the shared workspace package (types, enums, business calcs).
  transpilePackages: ['@chantia/shared'],
};

/** Points the plugin at our config, which resolves the locale from a cookie. */
const withNextIntl = createNextIntlPlugin('./src/shared/i18n/request.ts');

export default withNextIntl(nextConfig);
