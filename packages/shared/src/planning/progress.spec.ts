import { describe, expect, it } from 'vitest';
import { averageProgress, computeProgress } from './progress';

interface Line {
  progress?: number | null;
  durationPercent?: number | null;
  children: Line[];
}
const leaf = (progress: number | null, durationPercent?: number): Line => ({
  progress,
  durationPercent,
  children: [],
});
const parent = (children: Line[], durationPercent?: number): Line => ({
  durationPercent,
  children,
});

describe('computeProgress', () => {
  it('takes what was entered on a line without children, nothing counting as zero', () => {
    expect(computeProgress(leaf(40))).toBe(40);
    expect(computeProgress(leaf(null))).toBe(0);
  });

  it('shares a task evenly among subtasks that have no weight', () => {
    expect(computeProgress(parent([leaf(100), leaf(50), leaf(0), leaf(50)]))).toBe(50);
  });

  it('weights tasks and phases by their duration', () => {
    expect(computeProgress(parent([leaf(100, 75), leaf(0, 25)]))).toBe(75);
  });

  it('uses a subtask’s weight when a plan gives one', () => {
    expect(computeProgress(parent([leaf(100, 90), leaf(0, 10)]))).toBe(90);
  });

  it('falls back to an even share when one sibling has no weight', () => {
    expect(computeProgress(parent([leaf(100, 90), leaf(0)]))).toBe(50);
  });

  it('rolls up through every level', () => {
    const phaseA = parent([parent([leaf(100), leaf(100)], 100)], 50);
    const phaseB = parent([parent([leaf(50), leaf(0)], 100)], 50);

    expect(averageProgress([phaseA, phaseB])).toBe(62.5);
  });

  it('treats a plan with nothing in it as not started', () => {
    expect(averageProgress([])).toBe(0);
  });
});
