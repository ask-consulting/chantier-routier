import { PlanNodeLevel } from '@chantia/shared';

/** What a planning is copied from: a reference plan or an organization's plan. */
export interface SourceNode {
  label: string;
  isControl: boolean;
  code: string | null;
  children: SourceNode[];
}

export interface SourcePlan {
  nodes: SourceNode[];
}

/** One line about to be stored, with its place in the tree. */
export interface NewTask {
  id: string;
  parentId: string | null;
  level: PlanNodeLevel;
  label: string;
  sortOrder: number;
  isControl: boolean;
  sourceCode: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
}

/** Rebuilds a tree from flat rows, kept in the order they came in. */
export function treeOf<R, N>(
  rows: readonly R[],
  idOf: (row: R) => string,
  parentOf: (row: R) => string | null,
  build: (row: R, children: N[]) => N,
): N[] {
  const byParent = new Map<string | null, R[]>();
  for (const row of rows) {
    const parent = parentOf(row);
    byParent.set(parent, [...(byParent.get(parent) ?? []), row]);
  }
  const childrenOf = (parent: string | null): N[] =>
    (byParent.get(parent) ?? []).map((row) => build(row, childrenOf(idOf(row))));
  return childrenOf(null);
}
