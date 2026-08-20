/**
 * What runs before a commit lands.
 *
 * The gate is CI — this is the fast copy of it, and the two must not drift into
 * disagreeing. So the hook runs exactly one thing, ESLint, on exactly the files
 * you staged. It does not build, typecheck or test: those need the whole
 * workspace and turn a three-second commit into a ninety-second one, which is
 * how hooks end up being bypassed with `--no-verify` out of habit.
 *
 * Each package is linted from its own directory. ESLint 9 resolves a flat config
 * from the working directory, not from the file being linted, so running one
 * ESLint at the root would silently apply the root's config — which does not
 * exist — to all three packages. `pnpm --filter` moves the working directory,
 * and the absolute paths lint-staged hands over still resolve.
 *
 * `--fix` is deliberate: lint-staged re-stages what it rewrites, so a fixable
 * violation never becomes a failed commit. `--max-warnings=0` closes the gap
 * where a warning passes here and fails CI.
 */

const lint = (pkg) => (files) =>
  `pnpm --filter ${pkg} exec eslint --fix --max-warnings=0 ${files.map((f) => JSON.stringify(f)).join(' ')}`;

export default {
  'apps/api/src/**/*.ts': lint('@chantia/api'),
  'apps/web/src/**/*.{ts,tsx}': lint('@chantia/web'),
  'packages/shared/src/**/*.ts': lint('@chantia/shared'),
};
