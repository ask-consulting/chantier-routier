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
  },
});
