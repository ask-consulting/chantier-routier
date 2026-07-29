import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile the shared workspace package (types, enums, business calcs).
  transpilePackages: ['@chantia/shared'],
};

export default nextConfig;
