import Link from 'next/link';
import type { ComponentProps } from 'react';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './button';

/**
 * A link that looks like a button — for "go somewhere", where `Button` is for
 * "do something". Not a `<button>` wrapping an `<a>`: nesting interactive
 * elements is invalid HTML, and a screen reader announces the wrong role.
 */
export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
