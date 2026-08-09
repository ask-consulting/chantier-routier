'use client';

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  /** Shown under the field until an error replaces it. */
  hint?: ReactNode;
  /** The API's message. Its presence is what puts the field in the error state. */
  error?: ReactNode;
}

/**
 * A labelled input, wired for accessibility in one place.
 *
 * The label is bound to the input, the hint and error are announced through
 * `aria-describedby`, and the error sets `aria-invalid` — none of which anyone
 * remembers to do by hand on the twentieth form.
 *
 * The error is rendered from the API's `{ field, code, message }` payload, so a
 * password rejected for four reasons shows all four rather than one at a time.
 */
export function Field({ label, hint, error, className, ...props }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>

      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          'h-10 rounded-control border bg-surface-raised px-3 text-sm text-fg',
          'placeholder:text-fg-subtle transition-colors',
          'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-muted',
          error ? 'border-danger' : 'border-border-strong',
          className,
        )}
        {...props}
      />

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
