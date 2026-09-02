import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',

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
   */
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      // Barrels re-export; there is nothing in them to exercise.
      exclude: ['**/index.ts'],
      // Au-dessus de 80 % : le cliquet tient, il ne monte plus. La règle des
      // +5 par PR s'arrête là — voir `docs/14-etat-des-lieux.md` §2.3.
      thresholds: { statements: 82, branches: 77, functions: 78, lines: 81 },
    },
  },
});
