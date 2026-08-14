'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Permission, type IWorksite } from '@chantia/shared';
import { Badge, TD, TH, THead, TRow, Table } from '@/shared/ui';
import { formatAmount } from '@/shared/lib/format';
import type { Locale } from '@/shared/i18n/config';
import { usePermission } from '@/features/auth';
import { WORKSITE_STATUS_TONE } from '../model/worksite-display';

/**
 * The rows, and nothing else.
 *
 * It takes worksites and returns markup: no query, no loading state, no empty
 * state. That is what makes it reusable — a dashboard extract, a printable
 * report or a picker can render the same table without inheriting the list
 * page's fetching.
 */
export function WorksiteTable({ worksites }: { worksites: IWorksite[] }) {
  const t = useTranslations('worksites');
  // Status labels are translations, so they come from the message bundle; the
  // tone that goes with them stays in `model/worksite-display.ts`.
  const tStatus = useTranslations('worksiteStatus');
  const locale = useLocale() as Locale;
  // `budget:read` is split from `worksite:read` on purpose: a foreman needs the
  // worksite without seeing its margin. A whole column, not a disabled cell —
  // a greyed-out figure still tells you an order of magnitude.
  const showsBudget = usePermission(Permission.BUDGET_READ);

  return (
    <Table>
      <THead>
        <tr>
          <TH>{t('code')}</TH>
          <TH>{t('name')}</TH>
          <TH>{t('client')}</TH>
          <TH>{t('status')}</TH>
          {showsBudget && <TH numeric>{t('budget')}</TH>}
        </tr>
      </THead>
      <tbody>
        {worksites.map((worksite) => (
          <TRow key={worksite.id}>
            <TD className="font-mono text-xs text-fg-muted">{worksite.code}</TD>
            <TD className="font-medium">{worksite.name}</TD>
            <TD className="text-fg-muted">{worksite.client ?? '—'}</TD>
            <TD>
              <Badge tone={WORKSITE_STATUS_TONE[worksite.status]} dot>
                {tStatus(worksite.status)}
              </Badge>
            </TD>
            {showsBudget && <TD numeric>{formatAmount(worksite.totalBudget, locale)}</TD>}
          </TRow>
        ))}
      </tbody>
    </Table>
  );
}
