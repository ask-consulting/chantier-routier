'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Permission, type IWorksite } from '@chantia/shared';
import { Alert, Button, EmptyState, Field, Select, Skeleton } from '@/shared/ui';
import { CreateIcon } from '@/shared/lib/icons';
import { Can } from '@/features/auth';
import { useWorksites } from '../api/worksite.queries';
import { WORKSITE_STATUS } from '../model/worksite-display';
import { useWorksiteFilters, type StatusFilter } from '../model/use-worksite-filters';
import { WorksiteDrawer } from './worksite-drawer';
import { WorksiteList } from './worksite-table';

/**
 * The worksite list screen — same shape as `WorkerListPage`: the four states a
 * remote list can be in, plus "empty *because of a filter*", which needs a
 * different sentence and a different way out than "nothing was ever created".
 *
 * The route file in `app/` only mounts it.
 */
export function WorksiteListPage() {
  const t = useTranslations('worksites');
  const tStatus = useTranslations('worksiteStatus');
  const filters = useWorksiteFilters();
  // One slot for the target, not two booleans, so the drawer can never be
  // asked to both create and edit at once.
  const [editing, setEditing] = useState<IWorksite | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isPending, isError, error, isPlaceholderData } = useWorksites(filters.params);

  const statusOptions = [
    { value: 'all', label: t('allStatuses') },
    ...WORKSITE_STATUS.map((status) => ({ value: status, label: tStatus(status) })),
  ];

  const drawerOpen = creating || editing !== null;
  const closeDrawer = (): void => {
    setCreating(false);
    setEditing(null);
  };

  return (
    <section className="flex flex-col gap-section">
      <header className="flex flex-wrap items-baseline justify-between gap-stack">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          {data && <span className="text-sm text-fg-muted">{data.total}</span>}
        </div>
        {/* Hidden for a foreman, who may read worksites but not create one. The
          * API enforces the same rule; this only spares a pointless 403. */}
        <Can permission={Permission.WORKSITE_MANAGE}>
          <Button variant="primary" onClick={() => setCreating(true)}>
            <CreateIcon className="size-4 shrink-0" aria-hidden />
            {t('create')}
          </Button>
        </Can>
      </header>

      {/* Remounted per target (`worksite-1`, or `create`) so the form always
        * starts from the right values. */}
      <WorksiteDrawer
        key={editing?.id ?? 'create'}
        open={drawerOpen}
        worksite={editing}
        onClose={closeDrawer}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:flex-1">
          <Field
            label={t('searchLabel')}
            type="search"
            value={filters.search}
            onChange={(event) => filters.setSearch(event.target.value)}
            placeholder={t('searchPlaceholder')}
          />
        </div>
        <Select
          label={t('statusLabel')}
          options={statusOptions}
          value={filters.status}
          onChange={(event) => filters.setStatus(event.target.value as StatusFilter)}
        />
        {filters.isFiltering && (
          <Button variant="ghost" onClick={filters.clear}>
            {t('clearFilters')}
          </Button>
        )}
      </div>

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

      {data && data.items.length === 0 && !filters.isFiltering && (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={
            <Can permission={Permission.WORKSITE_MANAGE}>
              <Button variant="primary" onClick={() => setCreating(true)}>
                {t('create')}
              </Button>
            </Can>
          }
        />
      )}

      {data && data.items.length === 0 && filters.isFiltering && (
        <EmptyState
          title={t('noResultTitle')}
          description={t('noResultDescription')}
          action={<Button onClick={filters.clear}>{t('clearFilters')}</Button>}
        />
      )}

      {data && data.items.length > 0 && (
        // Dimmed while a new filter is in flight: the rows on screen are the
        // previous answer.
        <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <WorksiteList worksites={data.items} onEdit={setEditing} />
        </div>
      )}
    </section>
  );
}
