import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Vitest does not read the `paths` of `tsconfig.json`, so the same aliases are
 * declared here. Without them any spec that reaches a file importing `@shared/…`
 * fails to resolve — which is why the handlers had no unit tests until now.
 *
 * Keep this list in sync with `compilerOptions.paths` in `tsconfig.json`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@config': resolve(__dirname, 'src/config'),
      '@shared': resolve(__dirname, 'src/app/shared'),
      '@worksite': resolve(__dirname, 'src/app/worksite'),
      '@identity': resolve(__dirname, 'src/identity'),
      '@src': resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
  },
});
