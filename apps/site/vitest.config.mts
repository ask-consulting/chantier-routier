import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      // Logic only: the markup is exercised by looking at the page.
      include: ['src/demo/**/*.ts', 'src/lib/**/*.ts'],
      exclude: ['src/lib/config.ts', 'src/**/*.spec.ts'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
