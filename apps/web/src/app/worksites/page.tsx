'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import type { IWorksite } from '@chantia/shared';
import { fetchWorksites } from '@/lib/api';
import { RequireSession } from '@/components/auth/require-session';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Skeleton,
  TD,
  TH,
  THead,
  TRow,
  Table,
} from '@/components/ui';
import { WORKSITE_STATUS_TONE, formatAmount } from '@/lib/domain-display';
import type { Locale } from '@/i18n/config';

function Worksites() {
  const t = useTranslations('worksites');
  // Status labels are translations, so they come from the message bundle; the
  // tone that goes with them stays in `domain-display.ts`.
  const tStatus = useTranslations('worksiteStatus');
  const locale = useLocale() as Locale;

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['worksites'],
    queryFn: fetchWorksites,
  });

  return (
    <section className="flex flex-col gap-section">
      <header className="flex items-baseline justify-between gap-stack">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          {data && <span className="text-sm text-fg-muted">{data.total}</span>}
        </div>
        <Button variant="primary">{t('create')}</Button>
      </header>

      {isPending && (
        <div className="flex flex-col gap-2" aria-busy>
          {/* Same height as the rows they replace, so the table does not jump. */}
          <Skeleton className="h-10" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      )}

      {isError && (
        <Alert tone="danger">
          {t('loadError', {
            reason: error instanceof Error ? error.message : t('unknownError'),
          })}
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={<Button variant="primary">{t('create')}</Button>}
        />
      )}

      {data && data.items.length > 0 && (
        <Table>
          <THead>
            <tr>
              <TH>{t('code')}</TH>
              <TH>{t('name')}</TH>
              <TH>{t('client')}</TH>
              <TH>{t('status')}</TH>
              <TH numeric>{t('budget')}</TH>
            </tr>
          </THead>
          <tbody>
            {data.items.map((worksite: IWorksite) => (
              <TRow key={worksite.id}>
                <TD className="font-mono text-xs text-fg-muted">{worksite.code}</TD>
                <TD className="font-medium">{worksite.name}</TD>
                <TD className="text-fg-muted">{worksite.client ?? '—'}</TD>
                <TD>
                  <Badge tone={WORKSITE_STATUS_TONE[worksite.status]} dot>
                    {tStatus(worksite.status)}
                  </Badge>
                </TD>
                <TD numeric>{formatAmount(worksite.totalBudget, locale)}</TD>
              </TRow>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
}

export default function WorksitesPage() {
  return (
    <RequireSession>
      <Worksites />
    </RequireSession>
  );
}
