/**
 * The dates of a worksite's planning — pure, so the API and the screens agree.
 * Dates are `YYYY-MM-DD` strings, counted in UTC: a planned day is a day.
 */

export interface ScheduledNode {
  plannedStart: string | null;
  plannedEnd: string | null;
  children: ScheduledNode[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const toUtc = (day: string): number => Date.parse(`${day.slice(0, 10)}T00:00:00.000Z`);
const fromUtc = (time: number): string => new Date(time).toISOString().slice(0, 10);

/** Days from `from` to `to`, both counted. */
export function planDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS) + 1;
}

function leavesOf<T extends { children: T[] }>(nodes: readonly T[]): T[] {
  return nodes.flatMap((node) => (node.children.length === 0 ? [node] : leavesOf(node.children)));
}

/**
 * Proposes dates: the lowest lines one after the other, sharing the period
 * evenly. The library has no durations, so this is a starting point to adjust,
 * never a forecast. Lines share a day when there are more lines than days.
 */
export function proposeSchedule<T extends { children: T[] }>(
  nodes: readonly T[],
  start: string,
  end: string,
): Map<T, { plannedStart: string; plannedEnd: string }> {
  const leaves = leavesOf(nodes);
  const days = Math.max(1, planDays(start, end));
  const first = toUtc(start);
  const dated = new Map<T, { plannedStart: string; plannedEnd: string }>();
  leaves.forEach((leaf, index) => {
    const from = Math.floor((index * days) / leaves.length);
    const to = Math.max(from, Math.floor(((index + 1) * days) / leaves.length) - 1);
    dated.set(leaf, {
      plannedStart: fromUtc(first + from * DAY_MS),
      plannedEnd: fromUtc(first + to * DAY_MS),
    });
  });
  return dated;
}

/** A line with children runs from the earliest of them to the latest. */
export function rollUpSchedule<T extends ScheduledNode>(nodes: readonly T[]): T[] {
  return nodes.map((node) => {
    if (node.children.length === 0) {
      return node;
    }
    const children = rollUpSchedule(node.children);
    const starts = children.flatMap((child) => child.plannedStart ?? []).sort();
    const ends = children.flatMap((child) => child.plannedEnd ?? []).sort();
    return { ...node, children, plannedStart: starts[0] ?? null, plannedEnd: ends.at(-1) ?? null };
  });
}

/** The days a whole planning spans, or `null` when nothing is dated. */
export function scheduleWindow(
  nodes: readonly ScheduledNode[],
): { start: string; end: string } | null {
  const starts = nodes.flatMap((node) => node.plannedStart ?? []).sort();
  const ends = nodes.flatMap((node) => node.plannedEnd ?? []).sort();
  const start = starts[0];
  const end = ends.at(-1);
  return start && end ? { start, end } : null;
}
