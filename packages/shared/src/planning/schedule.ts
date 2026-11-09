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

function leafCount(node: { children: readonly unknown[] }): number {
  const children = node.children as readonly { children: readonly unknown[] }[];
  return children.length === 0 ? 1 : children.reduce((total, child) => total + leafCount(child), 0);
}

export interface PlannableNode<T> {
  children: T[];
  /** When it starts, in percent of its parent. */
  startPercent?: number | null;
  /** How long it lasts, in percent of its parent. */
  durationPercent?: number | null;
}

/**
 * Proposes dates for the lowest lines; a line with children takes theirs.
 *
 * Each group of siblings shares its parent's days. When all of them say when
 * they start and how long they last, in percent of the parent, they follow
 * that and may overlap. Otherwise they run one after the other, in proportion
 * to the lines under each. Never outside the period, and never less than a day.
 */
export function proposeSchedule<T extends PlannableNode<T>>(
  nodes: readonly T[],
  start: string,
  end: string,
): Map<T, { plannedStart: string; plannedEnd: string }> {
  const first = toUtc(start);
  const dated = new Map<T, { plannedStart: string; plannedEnd: string }>();

  const place = (node: T, from: number, days: number): void => {
    if (node.children.length > 0) {
      share(node.children, from, days);
      return;
    }
    dated.set(node, {
      plannedStart: fromUtc(first + from * DAY_MS),
      plannedEnd: fromUtc(first + (from + days - 1) * DAY_MS),
    });
  };

  const share = (siblings: readonly T[], from: number, days: number): void => {
    if (siblings.every((node) => node.startPercent != null && node.durationPercent != null)) {
      for (const node of siblings) {
        const offset = Math.min(Math.floor((days * (node.startPercent as number)) / 100), days - 1);
        const length = Math.max(1, Math.round((days * (node.durationPercent as number)) / 100));
        place(node, from + offset, Math.min(length, days - offset));
      }
      return;
    }
    const total = siblings.reduce((sum, node) => sum + leafCount(node), 0);
    let done = 0;
    for (const node of siblings) {
      const offset = Math.floor((done * days) / total);
      done += leafCount(node);
      const next = Math.floor((done * days) / total);
      place(node, from + Math.min(offset, days - 1), Math.max(1, next - offset));
    }
  };

  if (nodes.length > 0) {
    share(nodes, 0, Math.max(1, planDays(start, end)));
  }
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
