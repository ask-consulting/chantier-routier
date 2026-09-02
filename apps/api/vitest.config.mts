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
      '@config': resolve(import.meta.dirname, 'src/config'),
      '@shared': resolve(import.meta.dirname, 'src/app/shared'),
      '@worksite': resolve(import.meta.dirname, 'src/app/worksite'),
      '@notification': resolve(import.meta.dirname, 'src/app/notification'),
      '@identity': resolve(import.meta.dirname, 'src/identity'),
      '@src': resolve(import.meta.dirname, 'src'),
    },
  },

  /**
   * Decorators, spelled out rather than inherited.
   *
   * Vite 8 transforms with oxc, which defaults to the TC39 decorator proposal
   * and rejects a parameter decorator — `login(@Body() body)` — as a parse
   * error. It would pick up `experimentalDecorators` from `tsconfig.json`, but
   * that file *excludes* `**\/*.spec.ts`: production code parsed, specs did not.
   * That asymmetry is why only the spec building a Nest module broke.
   *
   * `emitDecoratorMetadata` belongs here for the same reason it is on in
   * `tsconfig.json` — Nest resolves constructor injection through
   * `design:paramtypes`, and without the metadata a testing module builds a
   * controller with `undefined` dependencies.
   */
  oxc: {
    decorator: { legacy: true, emitDecoratorMetadata: true },
  },

  test: {
    include: ['src/**/*.spec.ts'],

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
      exclude: [
        // Composition root and DI wiring: no branch of their own to take.
        'src/main.ts',
        '**/*.module.ts',
        // One-off maintenance entry points, run by hand.
        'src/scripts/**',
      ],
      // +5 points à chaque PR qui touche ce paquet, jusqu'à 80 % — voir
      // `docs/14-etat-des-lieux.md` §2.3. Au-delà de 80, le cliquet tient sans monter.
      // 25 → 44 : le parcours d'authentification (arrivé par develop) et le
      // module invitation — renvoi, annulation, cloison entre locataires, et la
      // traduction du statut en SQL côté repository.
      thresholds: { statements: 44, branches: 45, functions: 43, lines: 44 },
    },
  },
});
