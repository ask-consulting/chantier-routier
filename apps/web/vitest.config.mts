import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Vitest does not read the `paths` of `tsconfig.json`, so the `@/…` alias is
 * declared again here — the same trap `apps/api` fell into, and the reason its
 * handlers went untested for so long.
 *
 * Keep in sync with `compilerOptions.paths` in `tsconfig.json`.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  test: {
    // jsdom, not node: these hooks call `useState` and `useEffect`, which need a
    // document to render into even when nothing is drawn on screen.
    environment: 'jsdom',
    include: ['src/**/*.spec.{ts,tsx}'],
  },
});
