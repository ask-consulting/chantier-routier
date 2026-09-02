import type { ButtonHTMLAttributes, Ref } from 'react';
import { cn } from '@/shared/lib/cn';
import { SpinnerIcon } from '@/shared/lib/icons';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-fg-on-accent hover:bg-primary-hover',
  secondary: 'bg-surface-raised text-fg border border-border-strong hover:bg-surface-muted',
  ghost: 'text-fg-muted hover:bg-surface-muted hover:text-fg',
  danger: 'bg-danger text-fg-on-accent hover:bg-danger-hover',
};

const SIZES: Record<ButtonSize, string> = {
  // 32px and 40px tall. Nothing smaller: this is a desktop application, but a
  // trackpad is not a mouse.
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  // Square, and no horizontal padding: an icon on its own does not want the
  // room a label needs, and a lopsided square is the first thing the eye sees.
  icon: 'size-9',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Action in flight. Disables the button, announces it with `aria-busy`, and
   * puts a spinner where the icon would be — so the same click is not made
   * twice while the first one is still travelling.
   */
  loading?: boolean;
  /** React 19 passes refs as ordinary props; no `forwardRef` needed. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * One `primary` button per view, at most — it is how the eye finds the main
 * action. Everything else is `secondary` or `ghost`.
 *
 * `className` **adds**, it does not override: two utilities for the same CSS
 * property are settled by their order in the generated stylesheet, not by the
 * order here, so `className="h-8"` on a `md` button silently does nothing. What
 * has to vary is a prop. See `docs/15` §3.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  className,
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      // Defaults to `button`: inside a form, an unmarked <button> submits it,
      // which turns "cancel" into "save" the first time someone presses Enter.
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-control font-medium',
        'transition-colors disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <SpinnerIcon className="size-4 shrink-0 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
