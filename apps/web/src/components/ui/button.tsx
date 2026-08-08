import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

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
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * One `primary` button per view, at most — it is how the eye finds the main
 * action. Everything else is `secondary` or `ghost`.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      // Defaults to `button`: inside a form, an unmarked <button> submits it,
      // which turns "cancel" into "save" the first time someone presses Enter.
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-control font-medium',
        'transition-colors disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
