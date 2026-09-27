'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Permission, type IWorksite } from '@chantia/shared';
import { Badge, Card, CardBody } from '@/shared/ui';
import { formatAmount, formatDate } from '@/shared/lib/format';
import type { Locale } from '@/shared/i18n/config';
import { usePermission } from '@/features/auth';
import { WORKSITE_STATUS_TONE } from '../model/worksite-display';
import { scheduleProgress } from '../model/schedule-progress';
import { ScheduleBar } from './schedule-bar';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * One worksite as a card — the whole card is the link to its page, so a
 * thumb on a tablet in the site hut does not have to find a small button.
 *
 * The budget shows for a reader with `budget:read` only; the API does not
 * send it to anyone else anyway.
 */
export function WorksiteCard({ worksite }: { worksite: IWorksite }) {
  const t = useTranslations('worksites');
  const tStatus = useTranslations('worksiteStatus');
  const locale = useLocale() as Locale;
  const showsBudget = usePermission(Permission.BUDGET_READ);

  return (
    <Link
      href={`/worksites/${worksite.id}`}
      className="group block rounded-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={t('openWorksite', { name: worksite.name })}
    >
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardBody className="flex h-full flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-xs text-fg-muted">{worksite.code}</p>
              <p className="truncate font-semibold group-hover:text-primary">{worksite.name}</p>
              <p className="truncate text-sm text-fg-muted">
                {worksite.client?.displayName ?? t('noClient')}
              </p>
            </div>
            <Badge tone={WORKSITE_STATUS_TONE[worksite.status]} dot>
              {tStatus(worksite.status)}
            </Badge>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <ScheduleBar
              progress={scheduleProgress(worksite.plannedStartDate, worksite.plannedEndDate, today())}
            />
            <div className="flex items-center justify-between gap-2 text-xs text-fg-muted">
              <span>
                {formatDate(worksite.plannedStartDate, locale)} →{' '}
                {formatDate(worksite.plannedEndDate, locale)}
              </span>
              {showsBudget && worksite.totalBudget !== undefined && (
                <span className="tabular-nums">{formatAmount(worksite.totalBudget, locale)}</span>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
