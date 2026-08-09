import { cn } from '@/shared/lib/cn';

/**
 * A copy-pasteable code block, for the design-system pages.
 *
 * Scrolls inside its own box so a long line never widens the page — the same
 * rule the `Table` follows, and for the same reason.
 */
export function Snippet({ children, className }: { children: string; className?: string }) {
  return (
    <pre
      className={cn(
        'overflow-x-auto rounded-control bg-surface-muted px-3 py-2 text-2xs leading-relaxed text-fg-muted',
        className,
      )}
    >
      <code>{children}</code>
    </pre>
  );
}
