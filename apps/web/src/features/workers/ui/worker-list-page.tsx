'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Permission, type IWorker } from '@chantia/shared';
import { Alert, Button, EmptyState, Field, Select, Skeleton } from '@/shared/ui';
import { CreateIcon } from '@/shared/lib/icons';
import { Can } from '@/features/auth';
import { useWorkers } from '../api/worker.queries';
import { useWorkerFilters, type ActiveFilter } from '../model/use-worker-filters';
import { WorkerList } from './worker-table';
import { WorkerDrawer } from './worker-drawer';

/**
 * The workers screen — same shape as `InvitationListPage`, the same four
 * remote-list states plus the fifth `InvitationListPage` introduced: empty
 * *because of a filter*, which needs a different sentence and a different way
 * out than "nobody was ever added".
 *
 * The rows come from `WorkerList`, which picks a table or cards by width. The
 * route in `app/` only mounts this.
 */
export function WorkerListPage() {
  const t = useTranslations('workers');
  const filters = useWorkerFilters();
  // `null` creates; a worker edits. Kept in one slot, not two booleans, so the
  // drawer can never be asked to both create and edit at once.
  const [editing, setEditing] = useState<IWorker | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isPending, isError, error, isPlaceholderData } = useWorkers(filters.params);

  const activeOptions = [
    { value: 'all', label: t('allStatuses') },
    { value: 'active', label: t('active') },
    { value: 'inactive', label: t('inactive') },
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
        {/* Hidden for anyone who may read the payroll but not manage it. The
          * API enforces the same rule; this only spares a pointless 403. */}
        <Can permission={Permission.WORKER_MANAGE}>
          <Button variant="primary" onClick={() => setCreating(true)}>
            <CreateIcon className="size-4 shrink-0" aria-hidden />
            {t('create')}
          </Button>
        </Can>
      </header>

      {/* Remounted per target (`worker-1`, or `create`) so the form always
        * starts from the right values — see `WorkerDrawer`'s own comment. */}
      <WorkerDrawer key={editing?.id ?? 'create'} open={drawerOpen} worker={editing} onClose={closeDrawer} />

      {/* Stacked on a phone, side by side from `sm`. The search takes the room
        * that is left, because a name is longer than a status. */}
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
          options={activeOptions}
          value={filters.active}
          onChange={(event) => filters.setActive(event.target.value as ActiveFilter)}
        />
        {filters.isFiltering && (
          <Button variant="ghost" onClick={filters.clear}>
            {t('clearFilters')}
          </Button>
        )}
      </div>

      {isPending && (
        <div className="flex flex-col gap-2" aria-busy>
          {/* Same heights as the rows they stand in for, so nothing jumps when
            * the data lands. */}
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
          // An empty state without a way out is a dead end — and here the way
          // out is the very action the screen exists for.
          action={
            <Can permission={Permission.WORKER_MANAGE}>
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
        // previous answer, and pretending otherwise for 300ms is how somebody
        // reads a stale list as the result of what they just typed.
        <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <WorkerList workers={data.items} onEdit={setEditing} />
        </div>
      )}
    </section>
  );
}
