import { describe, expect, it } from 'vitest';
import { PlanNodeLevel } from '../enums/plan.enums';
import { rollUpProgress, summarizePlan, type SummaryLine } from './summary';

const sub = (
  label: string,
  plannedStart: string,
  plannedEnd: string,
  progress: number,
  isControl = false,
): SummaryLine => ({
  level: PlanNodeLevel.SUBTASK,
  label,
  isControl,
  plannedStart,
  plannedEnd,
  progress,
  children: [],
});
const group = (level: PlanNodeLevel, label: string, children: SummaryLine[]): SummaryLine => ({
  level,
  label,
  isControl: false,
  plannedStart: null,
  plannedEnd: null,
  progress: 0,
  children,
});

// Phase A: 10 days, done. Phase B: 10 days, a task half done and a control.
const plan = (): SummaryLine[] => [
  group(PlanNodeLevel.PHASE, 'A', [
    group(PlanNodeLevel.TASK, 'A1', [sub('a', '2026-01-01', '2026-01-10', 100)]),
  ]),
  group(PlanNodeLevel.PHASE, 'B', [
    group(PlanNodeLevel.TASK, 'B1', [
      sub('b1', '2026-01-11', '2026-01-15', 100),
      sub('b2', '2026-01-16', '2026-01-20', 0),
    ]),
    group(PlanNodeLevel.TASK, 'B2', [sub('check', '2026-01-20', '2026-01-20', 0, true)]),
  ]),
];

describe('rollUpProgress', () => {
  it('averages subtasks evenly into their task', () => {
    const [, phaseB] = rollUpProgress(plan());
    expect(phaseB?.children[0]?.progress).toBe(50);
  });
});

describe('summarizePlan', () => {
  it('weights phases and tasks by their planned days', () => {
    const summary = summarizePlan(plan(), '2026-01-01');

    // A: 10 days at 100. B: B1 10 days at 50, B2 1 day at 0, so B is 500/11.
    expect(summary.progress).toBe(Math.round((10 * 100 + 10 * (500 / 11)) / 20));
    expect(summary.phases.map((phase) => phase.progress)).toEqual([100, 45]);
    expect(summary.phases[1]).toMatchObject({
      plannedStart: '2026-01-11',
      plannedEnd: '2026-01-20',
    });
  });

  it('says where the planning expected to be', () => {
    expect(summarizePlan(plan(), '2025-12-31').plannedProgress).toBe(0);
    expect(summarizePlan(plan(), '2026-01-21').plannedProgress).toBe(100);
  });

  it('is on time while nothing is overdue nor due', () => {
    const summary = summarizePlan(plan(), '2026-01-12');

    expect(summary.health).toBe('ok');
    expect(summary.delayDays).toBe(0);
  });

  it('asks for attention two days before an unfinished control', () => {
    expect(summarizePlan(plan(), '2026-01-18').health).toBe('control');
  });

  it('is late from the day after an unfinished line should have ended', () => {
    const summary = summarizePlan(plan(), '2026-01-23');

    expect(summary.health).toBe('late');
    expect(summary.delayDays).toBe(3);
  });

  it('lists the next lines to do, the earliest first', () => {
    expect(summarizePlan(plan(), '2026-01-12').nextSteps).toEqual([
      { label: 'b2', plannedStart: '2026-01-16', isControl: false },
      { label: 'check', plannedStart: '2026-01-20', isControl: true },
    ]);
  });

  it('copes with a worksite without a planning', () => {
    expect(summarizePlan([], '2026-01-01')).toMatchObject({
      progress: 0,
      plannedProgress: 0,
      health: 'ok',
      phases: [],
      nextSteps: [],
    });
  });
});
