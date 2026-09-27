import { describe, expect, it } from 'vitest';
import {
  WorksiteStatus,
  equipmentAvailability,
  periodsOverlap,
} from '@chantia/shared';
import { UserRole } from '@chantia/shared';
import { DEMO_ORGANIZATION_ID, buildDemoData, seedId, shift } from './demo-data';

/**
 * The demo data must hold together as the application's own rules would have
 * it — otherwise the first screen that opens on it shows something the API
 * would never have let happen.
 */

const ORG = DEMO_ORGANIZATION_ID;
const TODAY = '2026-09-27';
const data = buildDemoData(ORG, TODAY);

describe('seed ids', () => {
  it('are stable for an organization and a key, and differ across organizations', () => {
    expect(seedId(ORG, 'worksite:rn1')).toBe(seedId(ORG, 'worksite:rn1'));
    expect(seedId(ORG, 'worksite:rn1')).not.toBe(seedId('other-org', 'worksite:rn1'));
    expect(seedId(ORG, 'worksite:rn1')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('are never shared by two rows', () => {
    const ids = [
      ...data.clients.flatMap((c) => [c.id, ...c.contacts.map((contact) => contact.id)]),
      ...data.worksites.map((w) => w.id),
      ...data.workers.map((w) => w.id),
      ...data.equipment.map((e) => e.id),
      ...data.assignments.map((a) => a.id),
      ...data.accounts.map((a) => a.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('shift days across months', () => {
    expect(shift('2026-09-27', 5)).toBe('2026-10-02');
    expect(shift('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('the demo data', () => {
  it('gives one account per point of view, the foreman on the payroll', () => {
    expect(data.accounts.map((a) => a.role)).toEqual([
      UserRole.ADMIN,
      UserRole.SITE_MANAGER,
      UserRole.FOREMAN,
    ]);
    const foreman = data.accounts.find((a) => a.role === UserRole.FOREMAN)!;
    expect(data.workers.some((w) => w.id === foreman.workerId)).toBe(true);
    expect(data.accounts.every((a) => a.email.endsWith('@chantia-demo.test'))).toBe(true);
  });

  it('keeps worksite codes and fleet numbers unique, as the database requires', () => {
    const codes = data.worksites.map((w) => w.code);
    const fleet = data.equipment.map((e) => e.fleetNumber);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(fleet).size).toBe(fleet.length);
  });

  it('covers every worksite status, and a late worksite still in progress', () => {
    const statuses = new Set(data.worksites.map((w) => w.status));
    expect(statuses).toEqual(new Set(Object.values(WorksiteStatus)));
    expect(
      data.worksites.some((w) => w.status === WorksiteStatus.IN_PROGRESS && w.plannedEndDate < TODAY),
    ).toBe(true);
  });

  it('never puts a machine in two places on the same day', () => {
    for (const machine of data.equipment) {
      const stays = data.assignments.filter((a) => a.equipmentId === machine.id);
      for (const [i, a] of stays.entries()) {
        for (const b of stays.slice(i + 1)) {
          expect(periodsOverlap(a, b), `${a.id} / ${b.id}`).toBe(false);
        }
      }
    }
  });

  it('books a machine only while it is the organization’s to use', () => {
    for (const assignment of data.assignments) {
      const machine = data.equipment.find((e) => e.id === assignment.equipmentId)!;
      const { from, until } = equipmentAvailability(machine.pricing);
      expect(assignment.startDate >= from, assignment.id).toBe(true);
      expect(until === null || assignment.endDate <= until, assignment.id).toBe(true);
    }
  });

  it('prices each booking from its own pricing, with a primary contact per client', () => {
    expect(data.assignments.every((a) => a.cost > 0)).toBe(true);
    expect(data.clients.every((c) => c.contacts.filter((x) => x.isPrimary).length === 1)).toBe(true);
  });
});
