import { describe, expect, it } from 'vitest';
import { UserRole } from '@chantia/shared';
import {
  currentPhaseIndex,
  isVisibleTo,
  loadMyWorksites,
  phaseProgress,
  taskProgress,
  withSubtaskProgress,
  worksiteProgress,
  type MyWorksite,
} from './my-worksites';

const worksite = (): MyWorksite => ({
  ...loadMyWorksites()[0]!,
  assignedEmails: ['chef@test'],
  phases: [
    {
      label: 'A',
      startPercent: 0,
      durationPercent: 75,
      tasks: [
        {
          label: 'A1',
          durationPercent: 100,
          subtasks: [
            { id: 'a', label: 'a', progress: 100 },
            { id: 'b', label: 'b', progress: 100 },
          ],
        },
      ],
    },
    {
      label: 'B',
      startPercent: 75,
      durationPercent: 25,
      tasks: [
        {
          label: 'B1',
          durationPercent: 100,
          subtasks: [
            { id: 'c', label: 'c', progress: 50 },
            { id: 'd', label: 'd', progress: 0 },
          ],
        },
      ],
    },
  ],
});

describe('who sees a worksite', () => {
  it('shows every worksite to an admin', () => {
    expect(isVisibleTo(worksite(), { role: UserRole.ADMIN, email: 'x@test' })).toBe(true);
  });

  it('shows a worksite to whoever is assigned to it, and to nobody else', () => {
    expect(isVisibleTo(worksite(), { role: UserRole.FOREMAN, email: 'chef@test' })).toBe(true);
    expect(isVisibleTo(worksite(), { role: UserRole.SITE_MANAGER, email: 'x@test' })).toBe(false);
  });
});

describe('how progress adds up', () => {
  it('averages subtasks into their task and weights phases by duration', () => {
    const site = worksite();

    expect(taskProgress(site.phases[1]!.tasks[0]!)).toBe(25);
    expect(phaseProgress(site.phases[0]!)).toBe(100);
    expect(worksiteProgress(site)).toBeCloseTo(81.25);
  });

  it('finds the phase under way, and the last one when all are done', () => {
    const site = worksite();
    expect(currentPhaseIndex(site)).toBe(1);

    const done = withSubtaskProgress(withSubtaskProgress(site, 'c', 100), 'd', 100);
    expect(currentPhaseIndex(done)).toBe(1);
    expect(worksiteProgress(done)).toBe(100);
  });

  it('moves one subtask without touching the original', () => {
    const site = worksite();

    const moved = withSubtaskProgress(site, 'd', 100);

    expect(taskProgress(moved.phases[1]!.tasks[0]!)).toBe(75);
    expect(site.phases[1]!.tasks[0]!.subtasks[1]!.progress).toBe(0);
  });

  it('ships a usable demonstration file', () => {
    for (const site of loadMyWorksites()) {
      expect(site.phases.length).toBeGreaterThan(0);
      expect(worksiteProgress(site)).toBeGreaterThan(0);
      expect(worksiteProgress(site)).toBeLessThan(100);
    }
  });
});
