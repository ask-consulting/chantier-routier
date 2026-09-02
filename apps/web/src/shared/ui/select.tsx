'use client';

import { useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  options: readonly SelectOption[];
  /** Shown under the field until an error replaces it. */
  hint?: ReactNode;
  /** The API's message. Its presence is what puts the field in the error state. */
  error?: ReactNode;
  /**
   * Hides the label visually and keeps it for screen readers. For a filter bar,
   * where a row of labelled boxes costs more room than it explains — the label
   * still exists, it is simply not drawn.
   */
  labelHidden?: boolean;
}

/**
 * A labelled `<select>`, wired the same way `Field` wires an input.
 *
 * **A native select, on purpose.** A custom listbox would need the roving focus,
 * the type-ahead, the touch behaviour and the screen-reader semantics that this
 * element already has — and on a phone, the browser's own wheel is better than
 * anything we would draw. The day a filter needs multi-select or search, that is
 * a different component with a different name, not a rewrite of this one.
 */
export function Select({
  label,
  options,
  hint,
  error,
  labelHidden = false,
  className,
  ...props
}: SelectProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={cn('text-sm font-medium text-fg', labelHidden && 'sr-only')}>
        {label}
      </label>

      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          'h-10 rounded-control border bg-surface-raised px-3 text-sm text-fg',
          'transition-colors disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-muted',
          error ? 'border-danger' : 'border-border-strong',
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-xs text-fg-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
