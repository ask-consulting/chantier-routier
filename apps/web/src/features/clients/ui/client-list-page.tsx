'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Permission, type IClient } from '@chantia/shared';
import { Alert, Button, EmptyState, Field, Select, Skeleton } from '@/shared/ui';
import { CreateIcon } from '@/shared/lib/icons';
import { Can } from '@/features/auth';
import { useClients } from '../api/client.queries';
import { CLIENT_TYPES } from '../model/client-display';
import { useClientFilters, type TypeFilter } from '../model/use-client-filters';
import { ClientDrawer } from './client-drawer';
import { ClientList } from './client-table';

/**
 * The clients screen — the same shape as the workers and worksites screens:
 * the four states of a remote list, plus "empty because of a filter".
 */
export function ClientListPage() {
  const t = useTranslations('clients');
  const tType = useTranslations('clientType');
  const filters = useClientFilters();
  const [editing, setEditing] = useState<IClient | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isPending, isError, error, isPlaceholderData } = useClients(filters.params);

  const typeOptions = [
    { value: 'all', label: t('allTypes') },
    ...CLIENT_TYPES.map((type) => ({ value: type, label: tType(type) })),
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
        <Can permission={Permission.CLIENT_MANAGE}>
          <Button variant="primary" onClick={() => setCreating(true)}>
            <CreateIcon className="size-4 shrink-0" aria-hidden />
            {t('create')}
          </Button>
        </Can>
      </header>

      <ClientDrawer
        key={editing?.id ?? 'create'}
        open={drawerOpen}
        client={editing}
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
          label={t('typeFilterLabel')}
          options={typeOptions}
          value={filters.type}
          onChange={(event) => filters.setType(event.target.value as TypeFilter)}
        />
        {filters.isFiltering && (
          <Button variant="ghost" onClick={filters.clear}>
            {t('clearFilters')}
          </Button>
        )}
      </div>

      {isPending && (
        <div className="flex flex-col gap-2" aria-busy>
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
            <Can permission={Permission.CLIENT_MANAGE}>
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
        <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <ClientList clients={data.items} onEdit={setEditing} />
        </div>
      )}
    </section>
  );
}
