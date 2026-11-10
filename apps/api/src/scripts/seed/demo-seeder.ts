/**
 * Writes the demo organization: what `seed-demo.ts` runs by hand, and what the
 * API runs on its own when `DEMO_ENABLED` is set (see `app/demo`). Every row has
 * a fixed id, and `refreshDemo` deletes the organization before writing it
 * again, so a visitor's changes last until the next refresh.
 */
import { randomBytes } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  Locale,
  PlanNodeLevel,
  checkPasswordPolicy,
  proposeSchedule,
  toMinorUnits,
} from '@chantia/shared';
import { ScryptPasswordHasher } from '../../identity/infrastructure/security/scrypt-password-hasher';
import {
  DEMO_ORGANIZATION_ID,
  DEMO_ORGANIZATION_NAME,
  buildDemoData,
  demoProgress,
  seedId,
  shift,
  type DemoData,
} from './demo-data';

function date(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function money(value: number | null | undefined): bigint | null {
  return value === null || value === undefined ? null : BigInt(toMinorUnits(value, 'TND'));
}

/**
 * Deletes the demo organization and everything in it — including what somebody
 * added by hand while testing. Business tables hold the tenant as a soft
 * reference (no foreign key to `identity`), so they are emptied first; the
 * organization's delete then cascades to its accounts.
 */
export async function reset(prisma: PrismaClient): Promise<void> {
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
export function demoPassword(forbiddenTerms: string[]): string {
  const given = process.env.SEED_DEMO_PASSWORD;
  if (given) {
    const broken = checkPasswordPolicy(given, { forbiddenTerms });
    if (broken.length > 0) {
      throw new Error(`SEED_DEMO_PASSWORD breaks the password policy: ${broken.join(', ')}`);
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

export async function seedAccounts(
  prisma: PrismaClient,
  data: DemoData,
  password: string,
): Promise<void> {
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
    await prisma.user.upsert({
      where: { id: account.id },
      create: { id: account.id, ...row },
      update: row,
    });
  }
}

export async function seed(
  prisma: PrismaClient,
  organizationId: string,
  data: DemoData,
): Promise<void> {
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
      await tx.client.upsert({
        where: { id: client.id },
        create: { id: client.id, ...row },
        update: row,
      });
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
      await tx.worksite.upsert({
        where: { id: worksite.id },
        create: { id: worksite.id, ...row },
        update: row,
      });
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
      await tx.worker.upsert({
        where: { id: worker.id },
        create: { id: worker.id, ...row },
        update: row,
      });
    }

    const catalogTypes = await tx.equipmentType.findMany({ select: { id: true, code: true } });
    const typeIdOf = (code: string): string => {
      const type = catalogTypes.find((candidate) => candidate.code === code);
      if (!type) {
        throw new Error(`Unknown equipment type in the demo data: ${code}`);
      }
      return type.id;
    };

    for (const machine of data.equipment) {
      const { pricing } = machine;
      const row = {
        organizationId,
        typeId: typeIdOf(machine.typeCode),
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
      await tx.equipment.upsert({
        where: { id: machine.id },
        create: { id: machine.id, ...row },
        update: row,
      });
    }

    for (const assignment of data.assignments) {
      const row = {
        organizationId,
        equipmentId: assignment.equipmentId,
        worksiteId: assignment.worksiteId,
        startDate: date(assignment.startDate),
        endDate: date(assignment.endDate),
        pricing: assignment.pricing as unknown as Prisma.InputJsonObject,
        // Already in millimes: computed from the pricing, which is.
        cost: BigInt(assignment.cost),
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

interface PlanLine {
  code: string;
  label: string;
  isControl: boolean;
  startPercent: number | null;
  durationPercent: number | null;
  children: PlanLine[];
}

const LEVELS = [PlanNodeLevel.PHASE, PlanNodeLevel.TASK, PlanNodeLevel.SUBTASK];

/** A reference plan of the library as a tree, its labels in French. */
async function referencePlan(prisma: PrismaClient, code: string): Promise<PlanLine[]> {
  const template = await prisma.planTemplate.findUnique({
    where: { code },
    include: {
      nodes: {
        orderBy: { sortOrder: 'asc' },
        include: { translations: { where: { locale: 'fr' }, select: { label: true } } },
      },
    },
  });
  if (!template) {
    throw new Error(`Reference plan « ${code} » not found: apply the migrations first.`);
  }
  const lines = new Map<string | null, typeof template.nodes>();
  for (const node of template.nodes) {
    lines.set(node.parentId, [...(lines.get(node.parentId) ?? []), node]);
  }
  const childrenOf = (parent: string | null): PlanLine[] =>
    (lines.get(parent) ?? []).map((node) => ({
      code: node.code,
      label: node.translations[0]?.label ?? node.code,
      isControl: node.isControl,
      startPercent: node.startPercent,
      durationPercent: node.durationPercent,
      children: childrenOf(node.id),
    }));
  return childrenOf(null);
}

/**
 * Each planned worksite gets its planning, as « Créer le planning » would make
 * it, its progress as of today, and its team. Replaced whole on every run.
 */
export async function seedPlans(
  prisma: PrismaClient,
  organizationId: string,
  data: DemoData,
  today: string,
): Promise<void> {
  for (const plan of data.plans) {
    const worksite = data.worksites.find((candidate) => candidate.id === plan.worksiteId)!;
    const tree = await referencePlan(prisma, plan.templateCode);
    const dates = proposeSchedule(tree, worksite.plannedStartDate, worksite.plannedEndDate);
    const rows: Prisma.WorksiteTaskCreateManyInput[] = [];
    const visit = (lines: PlanLine[], parentId: string | null, depth: number): void => {
      lines.forEach((line, index) => {
        const id = seedId(organizationId, `task:${worksite.code}:${line.code}`);
        const planned = dates.get(line);
        rows.push({
          id,
          organizationId,
          worksiteId: worksite.id,
          parentId,
          level: LEVELS[depth] ?? PlanNodeLevel.SUBTASK,
          label: line.label,
          sortOrder: index + 1,
          isControl: line.isControl,
          sourceCode: line.code,
          plannedStart: planned ? date(planned.plannedStart) : null,
          plannedEnd: planned ? date(planned.plannedEnd) : null,
          progress: planned
            ? demoProgress(planned.plannedStart, planned.plannedEnd, today, plan.pace)
            : 0,
        });
        visit(line.children, id, depth + 1);
      });
    };
    visit(tree, null, 0);

    // « To control »: the first unfinished check falls due tomorrow.
    if (plan.pace === 'control') {
      const check = rows.find(
        (row) => row.isControl && (row.progress ?? 0) < 100 && row.plannedStart,
      );
      if (check) {
        check.plannedStart = date(shift(today, 1));
        check.plannedEnd = date(shift(today, 1));
        check.progress = 0;
      }
    }

    await prisma.$transaction([
      prisma.worksiteTask.deleteMany({ where: { worksiteId: worksite.id } }),
      prisma.worksiteTask.createMany({ data: rows }),
      prisma.worksiteMember.deleteMany({ where: { worksiteId: worksite.id } }),
      prisma.worksiteMember.createMany({
        data: plan.memberIds.map((userId) => ({ organizationId, worksiteId: worksite.id, userId })),
      }),
    ]);
  }
}

/** Deletes the demo organization and writes it again, its dates around `today`. */
export async function refreshDemo(
  prisma: PrismaClient,
  today: string,
): Promise<{ data: DemoData; password: string }> {
  const data = buildDemoData(DEMO_ORGANIZATION_ID, today);
  const password = demoPassword(
    data.accounts.flatMap((a) => [a.email, a.firstName, a.lastName]).concat(DEMO_ORGANIZATION_NAME),
  );
  await reset(prisma);
  // The accounts first: the business rows hang off the organization, and the
  // foreman's account points at a worker created just after — a soft
  // reference, so the order does not break anything.
  await seedAccounts(prisma, data, password);
  await seed(prisma, DEMO_ORGANIZATION_ID, data);
  await seedPlans(prisma, DEMO_ORGANIZATION_ID, data, today);
  return { data, password };
}
