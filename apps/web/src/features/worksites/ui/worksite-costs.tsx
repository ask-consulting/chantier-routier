'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Alert, Badge, Skeleton } from '@/shared/ui';
import { formatAmount } from '@/shared/lib/format';
import type { Locale } from '@/shared/i18n/config';
import { useWorksiteCosts } from '../api/worksite.queries';
import { varianceTone } from '../model/worksite-display';

/**
 * What the worksite costs, by source, against its budget — labour, expenses,
 * and the machines assigned to it over their whole booked period.
 *
 * Mounted only for a reader with `budget:read`; the API refuses anyone else.
 * Refreshed on its own when a machine is booked or moved: its query key sits
 * under `['worksites']`, which the planning invalidates.
 */
export function WorksiteCosts({ worksiteId }: { worksiteId: string }) {
  const t = useTranslations('worksites');
  const locale = useLocale() as Locale;
  const { data, isPending, isError } = useWorksiteCosts(worksiteId, true);

  if (isPending) {
    return <Skeleton className="h-28" />;
  }
  if (isError || !data) {
    return <Alert tone="danger">{t('costsError')}</Alert>;
  }

  const lines: [string, number][] = [
    [t('laborCost'), data.laborCost],
    [t('expensesCost'), data.expensesCost],
    [t('equipmentCost'), data.equipmentCost],
  ];

  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
      {lines.map(([label, amount]) => (
        <div key={label} className="contents">
          <dt className="text-fg-muted">{label}</dt>
          <dd className="text-end tabular-nums">{formatAmount(amount, locale, 2)}</dd>
        </div>
      ))}
      <dt className="border-t border-border pt-1 font-medium">{t('actualCost')}</dt>
      <dd className="border-t border-border pt-1 text-end font-medium tabular-nums">
        {formatAmount(data.actualCost, locale, 2)}
      </dd>
      <dt className="text-fg-muted">{t('budget')}</dt>
      <dd className="text-end tabular-nums">{formatAmount(data.totalBudget, locale, 2)}</dd>
      {data.variance !== null && (
        <>
          <dt className="text-fg-muted">{t('variance')}</dt>
          <dd className="text-end">
            <Badge tone={varianceTone(data.variance)}>{formatAmount(data.variance, locale, 2)}</Badge>
          </dd>
        </>
      )}
    </dl>
  );
}
