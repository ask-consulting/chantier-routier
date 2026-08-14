import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * A data table, which is what most of this application is.
 *
 * The wrapper scrolls horizontally on its own so the page body never does — a
 * budget column pushed off-screen must not take the navigation with it.
 */
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-surface border border-border bg-surface-raised">
      <table className={cn('w-full text-start text-sm', className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'bg-surface-muted text-2xs uppercase tracking-wide text-fg-muted',
        className,
      )}
      {...props}
    />
  );
}

export function TH({ className, numeric, ...props }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn('px-4 py-2.5 font-medium', numeric && 'text-end', className)}
      {...props}
    />
  );
}

export function TRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('border-t border-border transition-colors hover:bg-surface-muted', className)}
      {...props}
    />
  );
}

export function TD({
  className,
  numeric,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        'px-4 py-3',
        // Lining figures, so digits sit in columns down the page and two amounts
        // can be compared at a glance.
        numeric && 'text-end tabular-nums',
        className,
      )}
      {...props}
    />
  );
}
