'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Permission, type IWorksite } from '@chantia/shared';
import { Badge, Card, CardBody, TD, TH, THead, TRow, Table } from '@/shared/ui';
import { formatAmount } from '@/shared/lib/format';
import type { Locale } from '@/shared/i18n/config';
import { usePermission } from '@/features/auth';
import { WORKSITE_STATUS_TONE } from '../model/worksite-display';
import { WorksiteActions } from './worksite-actions';

interface RowsProps {
  worksites: IWorksite[];
  onEdit: (worksite: IWorksite) => void;
}

/**
 * The rows, in two shapes — a table from `md`, cards below it, for the reason
 * `WorkerList` gives: a table on a 390px screen scrolls its actions away.
 *
 * Two permissions shape what appears, and neither is decided by the page:
 *
 *   - `budget:read` — a whole column, not a disabled cell. A greyed-out figure
 *     still tells you an order of magnitude; a foreman sees the site, not its
 *     margin. The API omits the figure too; this only avoids an empty column.
 *   - `worksite:manage` — the actions. A foreman may read worksites but not
 *     change them, and a button that answers 403 is worse than no button.
 */
export function WorksiteList({ worksites, onEdit }: RowsProps) {
  return (
    <>
      <div className="md:hidden">
        <WorksiteCards worksites={worksites} onEdit={onEdit} />
      </div>
      <div className="hidden md:block">
        <WorksiteTable worksites={worksites} onEdit={onEdit} />
      </div>
    </>
  );
}

function WorksiteTable({ worksites, onEdit }: RowsProps) {
  const t = useTranslations('worksites');
  // Status labels are translations, so they come from the message bundle; the
  // tone that goes with them stays in `model/worksite-display.ts`.
  const tStatus = useTranslations('worksiteStatus');
  const locale = useLocale() as Locale;
  const showsBudget = usePermission(Permission.BUDGET_READ);
  const canManage = usePermission(Permission.WORKSITE_MANAGE);

  return (
    <Table>
      <THead>
        <tr>
          <TH>{t('code')}</TH>
          <TH>{t('name')}</TH>
          <TH>{t('client')}</TH>
          <TH>{t('status')}</TH>
          {showsBudget && <TH numeric>{t('budget')}</TH>}
          {canManage && (
            <TH>
              <span className="sr-only">{t('actions')}</span>
            </TH>
          )}
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
            {canManage && (
              <TD>
                <WorksiteActions worksite={worksite} onEdit={() => onEdit(worksite)} />
              </TD>
            )}
          </TRow>
        ))}
      </tbody>
    </Table>
  );
}

function WorksiteCards({ worksites, onEdit }: RowsProps) {
  const t = useTranslations('worksites');
  const tStatus = useTranslations('worksiteStatus');
  const locale = useLocale() as Locale;
  const showsBudget = usePermission(Permission.BUDGET_READ);
  const canManage = usePermission(Permission.WORKSITE_MANAGE);

  return (
    <ul className="flex flex-col gap-2">
      {worksites.map((worksite) => (
        <li key={worksite.id}>
          <Card>
            <CardBody className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{worksite.name}</p>
                  <p className="truncate text-sm text-fg-muted">
                    <span className="font-mono text-xs">{worksite.code}</span>
                    {worksite.client && ` · ${worksite.client}`}
                  </p>
                </div>
                <Badge tone={WORKSITE_STATUS_TONE[worksite.status]} dot>
                  {tStatus(worksite.status)}
                </Badge>
              </div>

              {showsBudget && (
                <p className="text-xs text-fg-muted">
                  {t('budgetValue', { amount: formatAmount(worksite.totalBudget, locale) })}
                </p>
              )}

              {canManage && (
                <WorksiteActions worksite={worksite} onEdit={() => onEdit(worksite)} compact />
              )}
            </CardBody>
          </Card>
        </li>
      ))}
    </ul>
  );
}
