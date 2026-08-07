import { cn } from '@/lib/cn';
import { LogoRoadC, type LogoMarkProps } from './logo-marks';

/** The mark currently in use. Swapping the import here changes it everywhere. */
export const Mark = LogoRoadC;

export interface LogoProps extends LogoMarkProps {
  /** Mark only — for a collapsed sidebar or a tab. */
  markOnly?: boolean;
}

/**
 * The lockup: mark plus wordmark.
 *
 * The wordmark is HTML rather than `<text>` inside the SVG, so it renders with
 * the interface font, stays selectable, and follows the theme. An SVG `<text>`
 * would depend on that font being installed wherever the file is opened.
 */
export function Logo({ size = 28, markOnly = false, className, ...props }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Mark size={size} {...props} />
      {!markOnly && (
        <span className="text-lg font-semibold tracking-tight text-fg">Chantia</span>
      )}
    </span>
  );
}
