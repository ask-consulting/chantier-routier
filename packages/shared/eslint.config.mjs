import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * What keeps `@chantia/shared` shareable.
 *
 * This package is the one piece of code the API, the web front and — the day it
 * exists — the mobile app all run. `06-api-conventions-ddd-cqrs.md` says why:
 * a cost calculation has to give the same answer on a server and on a phone with
 * no network, which only holds if there is no runtime underneath it.
 *
 * Most of that is already enforced without a linter, and it is worth knowing
 * which half is which. The package declares **zero** dependencies, and pnpm's
 * isolated `node_modules` means an undeclared import does not resolve at all —
 * `tsc` fails before ESLint is even asked. So a stray `import … from 'lodash'`
 * is already impossible.
 *
 * Node built-ins are the hole that leaves, and the only one. They resolve
 * everywhere, they need no dependency, and they are exactly what breaks React
 * Native while leaving the API's tests green — `crypto` for an id, `fs` for a
 * fixture, `process.env` for a flag. That is what the rule below is for, and
 * why it is a short list rather than an ambitious one.
 */
const NODE_BUILTINS = [
  'assert',
  'buffer',
  'child_process',
  'crypto',
  'events',
  'fs',
  'fs/promises',
  'http',
  'https',
  'net',
  'os',
  'path',
  'process',
  'stream',
  'timers',
  'url',
  'util',
  'worker_threads',
  'zlib',
];

const noRuntime = {
  paths: NODE_BUILTINS.map((name) => ({
    name,
    message:
      '@chantia/shared runs on a server, in a browser and on a phone. A Node built-in runs in one of the three.',
  })),
  patterns: [
    {
      // `node:fs` and `fs` are the same module and both have to be named.
      group: ['node:*'],
      message:
        '@chantia/shared runs on a server, in a browser and on a phone. A Node built-in runs in one of the three.',
    },
  ],
};

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'eslint.config.mjs'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-imports': ['error', noRuntime],
    },
  },
);
