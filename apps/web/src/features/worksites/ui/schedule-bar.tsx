'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/shared/lib/cn';
import type { ScheduleProgress } from '../model/schedule-progress';

/**
 * The planned period as a bar, and a sentence under it. Time elapsed, not work
 * done — the label says "planning", never "avancement", so nobody reads the
 * bar as a measure of the work.
 */
export function ScheduleBar({ progress }: { progress: ScheduleProgress }) {
  const t = useTranslations('worksites.schedule');

  const percent =
    progress.kind === 'on_schedule' ? progress.percent : progress.kind === 'overdue' ? 100 : 0;
  const label =
    progress.kind === 'unplanned'
      ? t('unplanned')
      : progress.kind === 'upcoming'
        ? t('upcoming', { days: progress.daysToStart })
        : progress.kind === 'overdue'
          ? t('overdue', { days: progress.daysLate })
          : t('onSchedule', { percent: progress.percent, days: progress.daysLeft });

  return (
    <div className="flex flex-col gap-1">
      {progress.kind !== 'unplanned' && (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={t('label')}
        >
          <div
            className={cn(
              'h-full rounded-full',
              progress.kind === 'overdue' ? 'bg-danger' : 'bg-primary',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      <p className={cn('text-xs', progress.kind === 'overdue' ? 'text-danger' : 'text-fg-muted')}>
        {label}
      </p>
    </div>
  );
}
