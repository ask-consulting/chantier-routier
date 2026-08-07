import { cn } from '@/lib/cn';

/**
 * The brand illustration — the full drawing, scene and all.
 *
 * A different job from the logo, and the reason both exist. The logo has to
 * survive 16 px, one colour and a browser tab; this one only has to be
 * inviting, and it can afford every detail the mark had to give up.
 *
 * Raster on purpose. An illustration has the right to be a PNG: nothing about
 * it needs to scale to a favicon or print in one colour.
 *
 * Where it belongs: the sign-in page, error pages, and the larger empty states.
 * Not in a header, not next to the wordmark, and never as a substitute for the
 * logo — two marks competing in one view read as two products.
 */
export function BrandIllustration({
  size = 240,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // Decorative: every page using it already carries the same message in text,
    // so announcing it again would only add noise for a screen reader.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-reference.png"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={cn('select-none', className)}
    />
  );
}
