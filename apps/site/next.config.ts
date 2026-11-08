import type { NextConfig } from 'next';

/**
 * Exported as plain files: the showcase has no server of its own, so it cannot
 * go down with the API and costs nothing to host.
 */
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
