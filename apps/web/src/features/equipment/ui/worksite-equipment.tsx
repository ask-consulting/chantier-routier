'use client';

import { useLocale, useTranslations } from 'next-intl';
import { assignmentPhase, type AssignmentPhase } from '@chantia/shared';
import { Alert, Badge, ButtonLink, Skeleton, type Tone } from '@/shared/ui';
import { formatAmount, formatDate } from '@/shared/lib/format';
import type { Locale } from '@/shared/i18n/config';
import { useAssignments } from '../api/equipment.queries';

const PHASE_TONE: Record<AssignmentPhase, Tone> = {
  upcoming: 'neutral',
  in_progress: 'info',
  past: 'success',
};

/**
 * The machines booked on one worksite, for its page — read-only. Booking,
 * moving and cancelling stay on the fleet's planning, one place for the rules
 * of who may change what; a link leads there.
 *
 * The cost of each stay shows for whoever reads budgets; the API sends it to
 * no one else.
 */
export function WorksiteEquipment({ worksiteId }: { worksiteId: string }) {
  const t = useTranslations('equipment');
  const locale = useLocale() as Locale;
  const { data, isPending, isError } = useAssignments({ worksiteId });
  const today = new Date().toISOString().slice(0, 10);

  if (isPending) {
    return <Skeleton className="h-16" />;
  }
  if (isError) {
    return <Alert tone="danger">{t('assignmentsError')}</Alert>;
  }

  return (
    <div className="flex flex-col gap-3">
      {data.items.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('noEquipmentOnWorksite')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {data.items.map((assignment) => {
            const phase = assignmentPhase(assignment, today);
            return (
              <li key={assignment.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {assignment.equipment.fleetNumber && (
                      <span className="font-mono text-xs text-fg-muted">
                        {assignment.equipment.fleetNumber} ·{' '}
                      </span>
                    )}
                    {assignment.equipment.designation}
                  </p>
                  <p className="text-fg-muted">
                    {t('period', {
                      from: formatDate(assignment.startDate, locale),
                      to: formatDate(assignment.endDate, locale),
                      days: assignment.days,
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={PHASE_TONE[phase]} dot>
                    {t(`phase.${phase}`)}
                  </Badge>
                  {assignment.cost !== undefined && (
                    <span className="text-xs tabular-nums text-fg-muted">
                      {formatAmount(assignment.cost, locale, 2)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div>
        <ButtonLink href="/equipment" variant="ghost" size="sm" className="-ms-3">
          {t('openFleetPlanning')}
        </ButtonLink>
      </div>
    </div>
  );
}
