/**
 * A worksite's progress: entered on the lowest lines, calculated above them.
 * Pure, so the screens, the API and the offline app give the same figure.
 */
export interface ProgressNode<T> {
  /** Entered by hand on a line with no children, from 0 to 100. */
  progress?: number | null;
  /** What it weighs among its siblings: its share of the parent's duration. */
  durationPercent?: number | null;
  children: readonly T[];
}

/** The siblings' average, weighted by duration; even if one has no weight. */
export function averageProgress<T extends ProgressNode<T>>(nodes: readonly T[]): number {
  if (nodes.length === 0) {
    return 0;
  }
  const weighted = nodes.every((node) => (node.durationPercent ?? 0) > 0);
  const weightOf = (node: T): number => (weighted ? (node.durationPercent as number) : 1);
  const total = nodes.reduce((sum, node) => sum + weightOf(node), 0);
  return nodes.reduce((sum, node) => sum + computeProgress(node) * weightOf(node), 0) / total;
}

/** A line's progress, in percent, not rounded: round only what is displayed. */
export function computeProgress<T extends ProgressNode<T>>(node: T): number {
  return node.children.length > 0 ? averageProgress(node.children) : (node.progress ?? 0);
}
