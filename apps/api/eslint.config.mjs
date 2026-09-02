import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * What holds the API's architecture together.
 *
 * `06-api-conventions-ddd-cqrs.md` draws the arrows and `08-identity-module.md`
 * draws the wall around `identity/`. Until this file existed, both were prose:
 * the folders described an intent and nothing stopped you crossing them. These
 * rules are what make the drawing true.
 *
 *   presentation ──► application ──► domain ◄── infrastructure
 *
 * Read the arrows as bans, which is what a linter can actually check:
 *
 *   1. `domain` depends on nothing — not on the layers above it, not on NestJS,
 *      not on Prisma. An entity you cannot instantiate in a bare test is not a
 *      domain entity.
 *   2. `application` and `presentation` never touch `infrastructure` — they go
 *      through the domain's ports, which is the whole point of the ports.
 *   3. Nothing under `app/` imports `identity/`. The business context sees a
 *      caller through verified token claims, never through a repository.
 *
 * There is no exception to any of the three. There was one, for
 * `infrastructure/exceptions/` — the business errors were `HttpException`s filed
 * under infrastructure and thrown from application, so no layer could hold them
 * legally. They are domain errors now, translated to HTTP once in
 * `DomainExceptionFilter`, and the hole in rule 2 closed with them.
 */

const noInfrastructure = {
  group: ['**/infrastructure/**', '@shared/infrastructure/**'],
  message:
    'Go through a port in domain/ports. A repository is wired in the module file, never imported by name.',
};

const noPresentation = {
  group: ['**/presentation/**', '@shared/presentation/**'],
  message: 'presentation/ is a leaf: it maps HTTP to buses. Nothing imports back into it.',
};

const noApplication = {
  group: ['**/application/**'],
  message: 'The arrows point towards domain/. Only presentation/ may reach application/.',
};

const noPersistence = {
  group: ['@prisma/client', '@prisma/client/**', '@shared/prisma', '@shared/prisma/**'],
  message:
    'Prisma stops at infrastructure/. Above it, the shape you want is the entity, not the row.',
};

const noFramework = {
  group: ['@nestjs/**', 'fastify', 'fastify/**', 'class-validator', 'class-transformer'],
  message:
    'domain/ depends on nothing. An entity that needs a framework to exist cannot be tested without one.',
};

/**
 * Rule 3 — the wall around `identity/`.
 *
 * The module is built to be extracted into its own service (`08-identity-module.md`).
 * Not one foreign key crosses the boundary today; the day the extraction happens,
 * a single import from `app/` would be the thing that makes it impossible.
 */
const noIdentity = {
  group: ['@identity', '@identity/**', '**/identity/**'],
  message:
    'identity/ exports nothing to the business. What you know of a caller comes from verified token claims.',
};

/** The mirror of the wall: identity/ knows nothing of the business either. */
const noBusiness = {
  group: ['@worksite', '@worksite/**', '@notification', '@notification/**'],
  message:
    'identity/ leaves with its own service one day. It cannot take a business module with it.',
};

/**
 * The one exception in this file, and it is on purpose.
 *
 * `invitation-issuer.service.ts` calls the notification use case in-process, so
 * the invitation email leaves at all. The alternative — an event nobody subscribes
 * to — is what the module did for months while invitations were copy-pasted by
 * hand (`docs/14-etat-des-lieux.md` §5.1).
 *
 * It is a debt, written down rather than hidden: the plan is a
 * `POST /notifications` on its own service, and on that day this import becomes
 * an HTTP client and this block disappears. Until then the exception is exactly
 * one file wide — every other file under `identity/` is still refused, so the
 * hole cannot quietly widen.
 */
const noBusinessExceptNotification = {
  group: ['@worksite', '@worksite/**'],
  message:
    'identity/ leaves with its own service one day. It cannot take a business module with it.',
};

const restrict = (...patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'prisma/generated/**', 'eslint.config.mjs'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Rule 3 first, so the layer rules below can restate it where they overlap.
  // `no-restricted-imports` does not merge across configs — the last matching
  // block replaces the earlier one entirely, so every block below carries the
  // full set that applies to it.
  {
    files: ['src/app/**/*.ts'],
    rules: restrict(noIdentity),
  },

  // The one door in the wall: wiring. `app.module.ts` imports `IdentityModule`
  // to register it with Nest, which is composition, not a dependency on its
  // internals. Keep this to the module file — a second entry would be a hole.
  {
    files: ['src/app/app.module.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },

  {
    files: ['src/identity/**/*.ts'],
    rules: restrict(noBusiness),
  },

  // Rule 1 — domain/ is the bottom of the stack and reaches nowhere.
  {
    files: ['src/**/domain/**/*.ts'],
    rules: restrict(
      noInfrastructure,
      noPresentation,
      noApplication,
      noPersistence,
      noFramework,
      noIdentity,
    ),
  },
  {
    files: ['src/identity/domain/**/*.ts'],
    rules: restrict(
      noInfrastructure,
      noPresentation,
      noApplication,
      noPersistence,
      noFramework,
      noBusiness,
    ),
  },

  // Rule 2 — application/ and presentation/ speak to ports, not to Prisma.
  {
    files: ['src/app/**/application/**/*.ts'],
    rules: restrict(noInfrastructure, noPresentation, noPersistence, noIdentity),
  },
  {
    files: ['src/identity/application/**/*.ts'],
    rules: restrict(noInfrastructure, noPresentation, noPersistence, noBusiness),
  },
  // The documented exception, one file wide. `no-restricted-imports` does not
  // merge across configs — this block replaces the one above for this file, so
  // it restates every pattern that still applies.
  {
    files: ['src/identity/application/services/invitation-issuer.service.ts'],
    rules: restrict(
      noInfrastructure,
      noPresentation,
      noPersistence,
      noBusinessExceptNotification,
    ),
  },
  {
    files: ['src/app/**/presentation/**/*.ts'],
    rules: restrict(noInfrastructure, noPersistence, noIdentity),
  },
  {
    files: ['src/identity/presentation/**/*.ts'],
    rules: restrict(noInfrastructure, noPersistence, noBusiness),
  },

  // infrastructure/ implements the ports. It may look down, never up.
  {
    files: ['src/app/**/infrastructure/**/*.ts'],
    rules: restrict(noPresentation, noApplication, noIdentity),
  },
  {
    files: ['src/identity/infrastructure/**/*.ts'],
    rules: restrict(noPresentation, noApplication, noBusiness),
  },

  // `app/shared/` is the transverse kit — Prisma service, tenant extension,
  // token verification. It is infrastructure by nature, so the persistence ban
  // does not apply; the wall around identity/ still does.
  {
    files: ['src/app/shared/**/*.ts'],
    rules: restrict(noIdentity),
  },
);
