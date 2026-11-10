import { PrismaClient } from '@prisma/client';
import { DEMO_ORGANIZATION_ID, DEMO_ORGANIZATION_NAME } from './seed/demo-data';
import { refreshDemo, reset } from './seed/demo-seeder';

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
 * **Starts over.** It deletes the organization and writes it again, every row
 * with a fixed id (`seed/demo-data.ts`), dates moved to around today. The API
 * does the same each day when `DEMO_ENABLED` is set: see `app/demo`.
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
    fail(
      'NODE_ENV is production. Demo data does not belong there — set SEED_FORCE=1 if you truly mean it.',
    );
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
    const { data, password } = await refreshDemo(prisma, today);

    console.log(`✓ « ${DEMO_ORGANIZATION_NAME} » (${DEMO_ORGANIZATION_ID}) is ready:`);
    console.log(
      `  ${data.clients.length} clients, ${data.worksites.length} worksites (${data.plans.length} planned), ${data.workers.length} workers,`,
    );
    console.log(
      `  ${data.equipment.length} machines, ${data.assignments.length} assignments — dates around ${today}.`,
    );
    console.log('\n  Sign in with:');
    for (const account of data.accounts) {
      console.log(`    ${account.email.padEnd(30)} ${account.role}`);
    }
    console.log(`  Password (all of them): ${password}`);
    console.log('\n  Run it again to start over; add -- --reset to delete the organization.');
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
