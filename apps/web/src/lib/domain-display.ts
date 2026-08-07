import { WorksiteStatus } from '@chantia/shared';
import type { Tone } from '@/components/ui/badge';
import { intlLocale, type Locale } from '@/i18n/config';

/**
 * How the domain reads on screen.
 *
 * The **tone** lives here; the **label** lives in `messages/*.json` under
 * `worksiteStatus.*`. That split is the point: a colour is a design decision and
 * belongs with the code, a wording is a translation and belongs with the other
 * translations. Keeping the French label here would have meant a second place to
 * edit for every new language.
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

/*
 * `USER_ROLE_TONE` lands with the authentication work: `UserRole` lives in
 * `@chantia/shared` on the `release/auth` line, not here. Its labels are already
 * written, under `userRole.*` in both message files.
 */

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

/**
 * Money and dates, formatted for the reading language.
 *
 * Arabic resolves to `ar-MA-u-nu-latn` — Latin digits. Eastern Arabic numerals
 * are correct for the Middle East but are not what Maghreb business writing
 * uses, and a French-speaking site manager reading the same table would lose it
 * entirely. See `i18n/config.ts`.
 */
export function formatAmount(value: number | null | undefined, locale: Locale): string {
  // An em dash for a missing amount — never `0 €`, which is a real figure.
  if (value === null || value === undefined) {
    return '—';
  }
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | null | undefined, locale: Locale): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium' }).format(
    new Date(value),
  );
}
