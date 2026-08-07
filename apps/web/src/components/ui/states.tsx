import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * A grey block standing in for content that is on its way.
 *
 * Preferred over a spinner for lists and tables: it keeps the layout at its
 * final size, so nothing jumps when the data lands.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-control bg-surface-muted', className)}
    />
  );
}

/**
 * Nothing to show — and a way out.
 *
 * An empty state without an action is a dead end; the `action` slot is there to
 * make leaving one awkward to forget.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-surface border border-dashed border-border-strong px-6 py-12 text-center">
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
