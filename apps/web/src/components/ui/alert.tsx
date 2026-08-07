import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import type { Tone } from './badge';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-fg border-border',
  info: 'bg-primary-subtle text-primary-on-subtle border-primary/20',
  signal: 'bg-signal-subtle text-signal-on-subtle border-signal/25',
  success: 'bg-success-subtle text-success-on-subtle border-success/25',
  danger: 'bg-danger-subtle text-danger-on-subtle border-danger/25',
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
}

/**
 * An inline message about the view it sits in — a failed load, a warning on a
 * budget. Not a toast: it stays until the situation it describes changes.
 */
export function Alert({ tone = 'neutral', className, ...props }: AlertProps) {
  return (
    <div
      // `alert` for anything the user must act on, so a screen reader announces
      // it without waiting for focus to land there.
      role={tone === 'danger' || tone === 'signal' ? 'alert' : 'status'}
      className={cn('rounded-surface border px-4 py-3 text-sm', TONES[tone], className)}
      {...props}
    />
  );
}
