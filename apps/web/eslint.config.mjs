import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

/**
 * What holds the architecture together.
 *
 * The layout in `src/` describes an intent; these rules are what make it true.
 * A folder is not a boundary if nothing stops you crossing it — cie-next's
 * modules are perfectly organised and perfectly permeable, and that is the
 * difference this file is meant to make.
 *
 * Three rules, in order of importance:
 *
 *   1. A feature is reached through its `index.ts`, never by a deep path.
 *   2. Features do not know about each other; they meet in `shared/` or in a
 *      route that composes both.
 *   3. Nothing imports from `app/` — routing is a leaf, not a library.
 *
 * See `docs/13-architecture-front.md`.
 */

const FEATURES = ['auth', 'invitations', 'worksites'];

/**
 * The one feature every other may import — through its index only.
 *
 * Permissions are transverse: any screen may need to hide what a role cannot do,
 * and routing that through `shared/` would drag the session into a layer that is
 * meant to know no domain. Keep this list at one entry; a second would mean the
 * rule has stopped meaning anything.
 */
const CROSS_CUTTING = 'auth';

/** `@/features/auth/**` is private; `@/features/auth` is the door. */
const deepFeatureImports = {
  group: ['@/features/*/*'],
  message:
    "Import through the feature's index — @/features/worksites, not @/features/worksites/api/…",
};

const appImports = {
  group: ['@/app/*', '@/app'],
  message: 'app/ holds routing only. Move what you need into a feature or into shared/.',
};

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },

  {
    rules: {
      'no-restricted-imports': ['error', { patterns: [deepFeatureImports, appImports] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Rule 2, one entry per feature: worksites may not import auth's internals or
  // its index, and vice versa. Anything genuinely common belongs in `shared/`.
  //
  // The exception below is deliberate and narrow: `auth` exposes `Can` and
  // `usePermission`, which every feature needs to hide what a role cannot do.
  // Permissions are a cross-cutting concern, so `auth`'s index — and only its
  // index — stays reachable.
  ...FEATURES.map((feature) => {
    const forbidden = FEATURES.filter(
      (other) => other !== feature && other !== CROSS_CUTTING,
    ).map((other) => `@/features/${other}`);

    return {
      files: [`src/features/${feature}/**/*.{ts,tsx}`],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            // An empty `group` is a schema error, not a no-op — so the
            // cross-feature clause only appears when there is a neighbour to
            // forbid. Today that means `auth` gets one and `worksites` gets none.
            patterns: [
              deepFeatureImports,
              appImports,
              ...(forbidden.length > 0
                ? [
                    {
                      group: forbidden,
                      message:
                        'A feature must not depend on another. Put the shared piece in shared/, or compose them in a route.',
                    },
                  ]
                : []),
            ],
          },
        ],
      },
    };
  }),

  // `shared/` is the bottom of the stack: it may not reach upwards.
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            appImports,
            {
              group: ['@/features/*', '@/features/*/*'],
              message:
                'shared/ knows no domain. If it needs a feature, it is not shared — move it into that feature.',
            },
          ],
        },
      ],
    },
  },
];

export default config;
