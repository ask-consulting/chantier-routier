import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * The five meanings a coloured label can carry in this application. A component
 * asks for a *tone*, never for a colour — which is what lets a status change its
 * colour in one place.
 */
export type Tone = 'neutral' | 'info' | 'signal' | 'success' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-neutral-subtle text-neutral-on-subtle',
  info: 'bg-primary-subtle text-primary-on-subtle',
  signal: 'bg-signal-subtle text-signal-on-subtle',
  success: 'bg-success-subtle text-success-on-subtle',
  danger: 'bg-danger-subtle text-danger-on-subtle',
};

const DOTS: Record<Tone, string> = {
  neutral: 'bg-fg-subtle',
  info: 'bg-primary',
  signal: 'bg-signal',
  success: 'bg-success',
  danger: 'bg-danger',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Adds a filled dot. Carries the meaning for anyone who cannot separate the hues. */
  dot?: boolean;
}

export function Badge({ tone = 'neutral', dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
      {...props}
    >
      {/* Colour is never the only channel: the label next to it always says the
        * same thing in words. The dot adds a second visual cue for the ~8% of
        * men with a colour vision deficiency. */}
      {dot && <span aria-hidden className={cn('size-1.5 rounded-full', DOTS[tone])} />}
      {children}
    </span>
  );
}
