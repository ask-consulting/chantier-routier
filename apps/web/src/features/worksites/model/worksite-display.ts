import { WorksiteStatus } from '@chantia/shared';
import type { Tone } from '@/shared/ui';

/**
 * How a worksite reads on screen.
 *
 * The **tone** lives here; the **label** lives in `messages/*.json` under
 * `worksiteStatus.*`. That split is the point: a colour is a design decision and
 * belongs with the code, a wording is a translation and belongs with the other
 * translations. Keeping the French label here would have meant a second place to
 * edit for every new language.
 *
 * This is `model/`, so it knows the domain but not React: no hook, no component,
 * no JSX. `ui/` reads from here, never the reverse.
 */

export const WORKSITE_STATUS_TONE: Record<WorksiteStatus, Tone> = {
  [WorksiteStatus.UPCOMING]: 'neutral',
  // Info, not success: a worksite in progress is the normal state, not an
  // achievement. Keeping green for "completed" is what makes green mean something.
  [WorksiteStatus.IN_PROGRESS]: 'info',
  [WorksiteStatus.COMPLETED]: 'success',
  // Signal rather than danger: a suspended worksite needs attention, it is not
  // a failure. Danger stays for what is irreversible or broken.
  [WorksiteStatus.SUSPENDED]: 'signal',
};

/** Every status, in the order a reader expects them — not the enum's order. */
export const WORKSITE_STATUS: readonly WorksiteStatus[] = [
  WorksiteStatus.UPCOMING,
  WorksiteStatus.IN_PROGRESS,
  WorksiteStatus.COMPLETED,
  WorksiteStatus.SUSPENDED,
];

/**
 * The tone of a budget variance. Positive means money left.
 *
 * Zero is deliberately `neutral` and not `success`: landing exactly on budget is
 * a rounding coincidence, not a result worth celebrating in green.
 */
export function varianceTone(variance: number | null): Tone {
  if (variance === null || variance === 0) {
    return 'neutral';
  }
  return variance > 0 ? 'success' : 'danger';
}
