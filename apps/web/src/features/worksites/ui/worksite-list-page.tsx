'use client';

import { useTranslations } from 'next-intl';
import { Permission } from '@chantia/shared';
import { Alert, Button, EmptyState, Skeleton } from '@/shared/ui';
import { Can } from '@/features/auth';
import { useWorksites } from '../api/worksite.queries';
import { WorksiteTable } from './worksite-table';

/**
 * The worksite list screen.
 *
 * It owns the four states a remote list can be in — loading, failed, empty,
 * populated — and delegates the rows to `WorksiteTable`. The route file in
 * `app/` only mounts it; that is the whole point of the split.
 *
 * No `useWorksiteList` hook here, deliberately. cie-next extracts one because
 * its lists carry server-side sorting, column filters and pagination state; ours
 * carries a single query. Adding the hook now would move six lines behind an
 * indirection and buy nothing. It arrives with the first filter — see
 * `docs/13-architecture-front.md`.
 */
export function WorksiteListPage() {
  const t = useTranslations('worksites');
  const { data, isPending, isError, error } = useWorksites();

  return (
    <section className="flex flex-col gap-section">
      <header className="flex items-baseline justify-between gap-stack">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          {data && <span className="text-sm text-fg-muted">{data.total}</span>}
        </div>
        {/* Hidden for a foreman, who may read worksites but not create one. The
          * API enforces the same rule; this only spares a pointless 403. */}
        <Can permission={Permission.WORKSITE_MANAGE}>
          <Button variant="primary">{t('create')}</Button>
        </Can>
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
          action={
            <Can permission={Permission.WORKSITE_MANAGE}>
              <Button variant="primary">{t('create')}</Button>
            </Can>
          }
        />
      )}

      {data && data.items.length > 0 && <WorksiteTable worksites={data.items} />}
    </section>
  );
}
