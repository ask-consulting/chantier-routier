import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { Locale, UserRole, checkPasswordPolicy } from '@chantia/shared';
import { AppModule } from '../app/app.module';
import { Organization } from '../identity/domain/entities/organization.entity';
import { User } from '../identity/domain/entities/user.entity';
import {
  ORGANIZATION_REPOSITORY_PORT,
  OrganizationRepositoryPort,
} from '../identity/domain/ports/organization-repository.port';
import {
  PASSWORD_HASHER_PORT,
  PasswordHasherPort,
} from '../identity/domain/ports/password-hasher.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../identity/domain/ports/user-repository.port';
import { TenantContext } from '../app/shared/tenant/tenant-context';

/**
 * Creates the organization and its first administrator.
 *
 * There has to be *some* way to make the first account, and self-registration is
 * closed: it would only ever create tenants nobody asked for, and an open
 * sign-up endpoint on a private back-office is a standing invitation.
 *
 * A one-off script rather than a boot-time hook: it runs when someone decides it
 * runs, the password lives in the shell for a few seconds instead of sitting in
 * a server's environment forever, and it cannot fire by accident on a restart.
 *
 * Idempotent — it reports and stops rather than touching an account that exists.
 *
 *   BOOTSTRAP_ADMIN_EMAIL=… BOOTSTRAP_ADMIN_PASSWORD=… \
 *     pnpm --filter @chantia/api bootstrap:admin
 */

const ORGANIZATION_NAME = process.env.BOOTSTRAP_ORGANIZATION ?? 'ELLOUZE construction';
/** The organization seeded by migration 20260726203601. Reused so ids stay stable. */
const SEEDED_ORGANIZATION_ID = 'b62107ee-2174-463f-9365-1fa967cc1925';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ Missing ${name}`);
    console.error(
      '\n  BOOTSTRAP_ADMIN_EMAIL=vous@exemple.fr BOOTSTRAP_ADMIN_PASSWORD=… \\\n' +
        '    pnpm --filter @chantia/api bootstrap:admin\n',
    );
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  const email = User.normalizeEmail(required('BOOTSTRAP_ADMIN_EMAIL'));
  const password = required('BOOTSTRAP_ADMIN_PASSWORD');
  const firstName = process.env.BOOTSTRAP_ADMIN_FIRST_NAME ?? 'Admin';
  const lastName = process.env.BOOTSTRAP_ADMIN_LAST_NAME ?? ORGANIZATION_NAME;

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  const users = app.get<UserRepositoryPort>(USER_REPOSITORY_PORT);
  const organizations = app.get<OrganizationRepositoryPort>(ORGANIZATION_REPOSITORY_PORT);
  const hasher = app.get<PasswordHasherPort>(PASSWORD_HASHER_PORT);
  const tenantContext = app.get(TenantContext);

  // Outside an HTTP request there is no tenant, so the Prisma filter is already
  // off; `run` only opens the store the extension expects to find.
  await tenantContext.run(async () => {
    const violations = checkPasswordPolicy(password, { forbiddenTerms: [email, firstName, lastName] });
    if (violations.length > 0) {
      console.error(`✗ Password rejected: ${violations.join(', ')}`);
      console.error('  See docs/08-identity-module.md §7.');
      await app.close();
      process.exit(1);
    }

    let organization = await organizations.findById(SEEDED_ORGANIZATION_ID);
    if (organization) {
      console.log(`· Organization already there — ${organization.name}`);
    } else {
      organization = await organizations.save(
        Organization.create({ id: SEEDED_ORGANIZATION_ID, name: ORGANIZATION_NAME }),
      );
      console.log(`✓ Organization created — ${organization.name}`);
    }

    const existing = await users.findByEmail(email);
    if (existing) {
      // Deliberately not updating: silently resetting a live administrator's
      // password from an environment variable is exactly the behaviour you do
      // not want in a bootstrap script.
      console.log(`· Account already there — ${existing.email} (${existing.role})`);
      console.log('  Nothing changed. Use "forgot password" to reset it.');
      return;
    }

    const admin = await users.save(
      User.create({
        id: randomUUID(),
        organizationId: organization.id,
        email,
        passwordHash: await hasher.hash(password),
        firstName,
        lastName,
        role: UserRole.ADMIN,
        locale: Locale.FRENCH,
      }),
    );
    console.log(`✓ Administrator created — ${admin.email}`);
  });

  await app.close();
}

void main().catch((error) => {
  console.error('✗ Bootstrap failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
