'use client';

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: ReactNode;
}

/**
 * A labelled checkbox — a native `<input type="checkbox">`, styled, never
 * reimplemented.
 *
 * A hand-drawn box needs its own keyboard handling (Space to toggle), its own
 * focus ring, and its own `role="checkbox"` plumbing to read right on a screen
 * reader — all things the element already does. `accent-color` is what lets a
 * native checkbox pick up the brand colour without any of that.
 *
 * The label sits to the *end* of the box rather than above it, unlike `Field`:
 * a checkbox is a single yes/no next to its own name, not a box under a
 * question — "Actif" reads next to its box the way it would on paper.
 */
export function Checkbox({ label, hint, className, id, ...props }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-medium text-fg">
        <input
          id={inputId}
          type="checkbox"
          aria-describedby={hint ? hintId : undefined}
          className={cn(
            'size-4 rounded-[0.25rem] border-border-strong text-primary accent-primary',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
            className,
          )}
          {...props}
        />
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
