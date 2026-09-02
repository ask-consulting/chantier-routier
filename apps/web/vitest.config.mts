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

  /**
   * The ratchet (`docs/14-etat-des-lieux.md` §2.3).
   *
   * These numbers are not a target — they are today's measurement, rounded
   * down. Their only job is that coverage can never *silently* fall: a number
   * nobody may lower beats an ambition nobody meets.
   *
   * `all: true` is what makes it a ratchet at all. Left at its default, v8
   * measures only the files a test happened to import, so ten new untested
   * modules would move the percentage not at all — and the gate would pass
   * while the codebase got worse. Counted honestly, the numbers are low. That
   * is the point: they are the real ones.
   *
   * Raise them when the real figure rises. Never lower them to make a build
   * pass.
   *
   * **La règle depuis le 2 septembre 2026 : +5 points par PR**, sur chaque
   * paquet que la PR touche. Une PR qui ajoute du code en ajoute donc le test,
   * plutôt que de repousser la dette au sprint suivant. Les chiffres ci-dessous
   * sont la mesure du jour arrondie vers le bas, comme toujours — l'exigence
   * porte sur la progression, pas sur un nombre choisi à l'avance.
   */
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      // Next.js pages and layouts: routing and composition, exercised by
      // running the app rather than by a unit test.
      exclude: ['src/app/**'],
      // 26 → 36 : le kit du design system, `format.ts` et `i18n/config.ts`,
      // qui n'avaient aucun test (docs/15 §4).
      thresholds: { statements: 36, branches: 37, functions: 33, lines: 37 },
    },
  },
});
