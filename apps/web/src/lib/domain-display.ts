import { WorksiteStatus } from '@chantia/shared';
import type { Tone } from '@/components/ui/badge';

/**
 * How the domain reads on screen: French label, and the tone that carries its
 * meaning.
 *
 * One table per enum, in one file. A status changing colour, or a role being
 * renamed, is a single edit — not a hunt through every page that happens to
 * render one. The API stays in English (see docs/06); the translation to French
 * lives here, at the edge.
 */

export interface Display {
  label: string;
  tone: Tone;
}

export const WORKSITE_STATUS: Record<WorksiteStatus, Display> = {
  [WorksiteStatus.UPCOMING]: { label: 'À venir', tone: 'neutral' },
  // Info, not success: a worksite in progress is the normal state, not an
  // achievement. Keeping green for "completed" is what makes green mean something.
  [WorksiteStatus.IN_PROGRESS]: { label: 'En cours', tone: 'info' },
  [WorksiteStatus.COMPLETED]: { label: 'Terminé', tone: 'success' },
  // Signal rather than danger: a suspended worksite needs attention, it is not
  // a failure. Danger stays for what is irreversible or broken.
  [WorksiteStatus.SUSPENDED]: { label: 'Suspendu', tone: 'signal' },
};

/*
 * `USER_ROLE` lands with the authentication work: `UserRole` lives in
 * `@chantia/shared` on the `release/auth` line, not here. The table belongs in
 * this file when the two merge — one place for every domain-to-tone mapping.
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

const EUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** An em dash for a missing amount — never `0 €`, which is a real figure. */
export function formatAmount(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : EUR.format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}
