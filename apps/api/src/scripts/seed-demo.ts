import { randomBytes } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { Locale, checkPasswordPolicy } from '@chantia/shared';
import { ScryptPasswordHasher } from '../identity/infrastructure/security/scrypt-password-hasher';
import {
  DEMO_ORGANIZATION_ID,
  DEMO_ORGANIZATION_NAME,
  buildDemoData,
  type DemoData,
} from './seed/demo-data';

/**
 * Creates a test organization, « Chantia Démo », and fills it — accounts to
 * sign in with (admin, site manager, foreman), clients, worksites in every
 * status, workers, a fleet, machines booked on worksites — so there is
 * something to look at and test against.
 *
 * **Its own organization, never a real one.** The tenant filter keeps it apart
 * from every other organization's data, and `--reset` deletes it whole.
 *
 * **A script, not a migration.** Migrations run on every deployment
 * (`prisma migrate deploy` at start-up, see `render.yaml`): a test
 * organization would land in production. This runs only when somebody runs it.
 *
 * **Idempotent.** Every row has a fixed id (`seed/demo-data.ts`): running it
 * again brings the same rows back to their seed values — dates moved to around
 * today — instead of adding more. The accounts get a new password each run,
 * printed at the end, unless `SEED_DEMO_PASSWORD` sets one.
 *
 * **Guarded.** It refuses a production `NODE_ENV`, and a database that is not
 * on this machine, unless told otherwise explicitly. Note that Prisma reads
 * `apps/api/.env` on its own: that is the database it will write to.
 *
 *   pnpm --filter @chantia/api build
 *   pnpm --filter @chantia/api seed:demo              # create or refresh
 *   pnpm --filter @chantia/api seed:demo -- --reset   # delete the organization
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'db', 'postgres']);

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/** Refuses what would be a mistake to seed: production, or a database elsewhere. */
function guard(): void {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_FORCE !== '1') {
    fail('NODE_ENV is production. Demo data does not belong there — set SEED_FORCE=1 if you truly mean it.');
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    fail('DATABASE_URL is not set.');
  }
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host) && process.env.SEED_ALLOW_REMOTE !== '1') {
    fail(
      `The database is on ${host}, not on this machine. ` +
        'Set SEED_ALLOW_REMOTE=1 to seed it anyway — a preview or staging database, never production.',
    );
  }
}

function date(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function money(value: number | null | undefined): Prisma.Decimal | null {
  return value === null || value === undefined ? null : new Prisma.Decimal(value.toFixed(3));
}

/**
 * Deletes the demo organization and everything in it — including what somebody
 * added by hand while testing. Business tables hold the tenant as a soft
 * reference (no foreign key to `identity`), so they are emptied first; the
 * organization's delete then cascades to its accounts.
 */
async function reset(prisma: PrismaClient): Promise<void> {
  const inDemo = { organizationId: DEMO_ORGANIZATION_ID };
  await prisma.$transaction([
    prisma.equipmentAssignment.deleteMany({ where: inDemo }),
    prisma.equipment.deleteMany({ where: inDemo }),
    // Cascades to their timesheets and expenses.
    prisma.worksite.deleteMany({ where: inDemo }),
    // Cascades to their contacts.
    prisma.client.deleteMany({ where: inDemo }),
    prisma.worker.deleteMany({ where: inDemo }),
    prisma.organization.deleteMany({ where: { id: DEMO_ORGANIZATION_ID } }),
  ]);
}

/**
 * A password the policy accepts — the same one the sign-up form enforces — so
 * the accounts can sign in through the real login.
 */
function demoPassword(forbiddenTerms: string[]): string {
  const given = process.env.SEED_DEMO_PASSWORD;
  if (given) {
    const broken = checkPasswordPolicy(given, { forbiddenTerms });
    if (broken.length > 0) {
      fail(`SEED_DEMO_PASSWORD breaks the password policy: ${broken.join(', ')}`);
    }
    return given;
  }
  for (;;) {
    const candidate = `Chantier-${randomBytes(6).toString('base64url')}-7`;
    if (checkPasswordPolicy(candidate, { forbiddenTerms }).length === 0) {
      return candidate;
    }
  }
}

async function seedAccounts(prisma: PrismaClient, data: DemoData, password: string): Promise<void> {
  const passwordHash = await new ScryptPasswordHasher().hash(password);
  await prisma.organization.upsert({
    where: { id: DEMO_ORGANIZATION_ID },
    create: { id: DEMO_ORGANIZATION_ID, name: DEMO_ORGANIZATION_NAME, currency: 'TND' },
    update: { name: DEMO_ORGANIZATION_NAME, currency: 'TND' },
  });
  for (const account of data.accounts) {
    const row = {
      organizationId: DEMO_ORGANIZATION_ID,
      email: account.email,
      passwordHash,
      firstName: account.firstName,
      lastName: account.lastName,
      role: account.role,
      active: true,
      workerId: account.workerId,
      locale: Locale.FRENCH,
    };
    await prisma.user.upsert({ where: { id: account.id }, create: { id: account.id, ...row }, update: row });
  }
}

async function seed(prisma: PrismaClient, organizationId: string, data: DemoData): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const client of data.clients) {
      const row = {
        organizationId,
        type: client.type,
        firstName: client.firstName,
        lastName: client.lastName,
        legalName: client.legalName,
        displayName: client.displayName,
        billingLine1: client.billingLine1,
        billingPostalCode: client.billingPostalCode,
        billingCity: client.billingCity,
        billingCountry: 'TN',
        deletedAt: null,
      };
      await tx.client.upsert({ where: { id: client.id }, create: { id: client.id, ...row }, update: row });
      await tx.clientContact.deleteMany({ where: { clientId: client.id } });
      await tx.clientContact.createMany({
        data: client.contacts.map((contact) => ({ ...contact, clientId: client.id })),
      });
    }

    for (const worksite of data.worksites) {
      const row = {
        organizationId,
        code: worksite.code,
        name: worksite.name,
        clientId: worksite.clientId,
        address: worksite.address,
        plannedStartDate: date(worksite.plannedStartDate),
        plannedEndDate: date(worksite.plannedEndDate),
        status: worksite.status,
        totalBudget: money(worksite.totalBudget),
        deletedAt: null,
      };
      await tx.worksite.upsert({ where: { id: worksite.id }, create: { id: worksite.id, ...row }, update: row });
    }

    for (const worker of data.workers) {
      const row = {
        organizationId,
        name: worker.name,
        qualification: worker.qualification,
        hourlyRate: money(worker.hourlyRate)!,
        active: worker.active,
        deletedAt: null,
      };
      await tx.worker.upsert({ where: { id: worker.id }, create: { id: worker.id, ...row }, update: row });
    }

    for (const machine of data.equipment) {
      const { pricing } = machine;
      const row = {
        organizationId,
        typeCode: machine.typeCode,
        designation: machine.designation,
        fleetNumber: machine.fleetNumber,
        brand: machine.brand,
        model: machine.model,
        registrationNumber: machine.registrationNumber,
        manufactureYear: machine.manufactureYear,
        status: machine.status,
        supplier: machine.supplier,
        acquisitionMethod: pricing.acquisitionMethod,
        acquisitionDate: date(pricing.acquisitionDate),
        purchasePrice: money(pricing.purchasePrice),
        residualValue: money(pricing.residualValue),
        usefulLifeMonths: pricing.usefulLifeMonths ?? null,
        monthlyPayment: money(pricing.monthlyPayment),
        buyoutValue: money(pricing.buyoutValue),
        dailyRate: money(pricing.dailyRate),
        contractEndDate: pricing.contractEndDate ? date(pricing.contractEndDate) : null,
        disposalDate: null,
        deletedAt: null,
      };
      await tx.equipment.upsert({ where: { id: machine.id }, create: { id: machine.id, ...row }, update: row });
    }

    for (const assignment of data.assignments) {
      const row = {
        organizationId,
        equipmentId: assignment.equipmentId,
        worksiteId: assignment.worksiteId,
        startDate: date(assignment.startDate),
        endDate: date(assignment.endDate),
        pricing: assignment.pricing as unknown as Prisma.InputJsonObject,
        cost: money(assignment.cost)!,
        notes: assignment.notes,
      };
      await tx.equipmentAssignment.upsert({
        where: { id: assignment.id },
        create: { id: assignment.id, ...row },
        update: row,
      });
    }
  });
}

async function main(): Promise<void> {
  guard();
  const prisma = new PrismaClient();

  try {
    if (process.argv.includes('--reset')) {
      await reset(prisma);
      console.log(`✓ « ${DEMO_ORGANIZATION_NAME} » deleted, with everything in it.`);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const data = buildDemoData(DEMO_ORGANIZATION_ID, today);
    const password = demoPassword(
      data.accounts.flatMap((a) => [a.email, a.firstName, a.lastName]).concat(DEMO_ORGANIZATION_NAME),
    );

    // The accounts first: the business rows hang off the organization, and the
    // foreman's account points at a worker created just after — a soft
    // reference, so the order does not break anything.
    await seedAccounts(prisma, data, password);
    await seed(prisma, DEMO_ORGANIZATION_ID, data);

    console.log(`✓ « ${DEMO_ORGANIZATION_NAME} » (${DEMO_ORGANIZATION_ID}) is ready:`);
    console.log(`  ${data.clients.length} clients, ${data.worksites.length} worksites, ${data.workers.length} workers,`);
    console.log(`  ${data.equipment.length} machines, ${data.assignments.length} assignments — dated around ${today}.`);
    console.log('\n  Sign in with:');
    for (const account of data.accounts) {
      console.log(`    ${account.email.padEnd(30)} ${account.role}`);
    }
    console.log(`  Password (all three): ${password}`);
    console.log('\n  Run it again to refresh; add -- --reset to delete the organization.');
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
