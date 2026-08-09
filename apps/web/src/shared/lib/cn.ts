/**
 * Joins class names, dropping anything falsy.
 *
 *   cn('px-3', isActive && 'bg-primary', className)
 *
 * Deliberately not `tailwind-merge`: that library exists to resolve *conflicts*
 * between classes, which is only needed when a component builds its classes by
 * concatenating overlapping sets. The components here take a single `className`
 * appended last, and CSS source order settles ties — so the 8 kB dependency
 * would buy nothing.
 */
export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}
