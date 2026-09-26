'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Permission, type IEquipment } from '@chantia/shared';
import { Alert, Button, EmptyState, Field, Select, Skeleton } from '@/shared/ui';
import { CreateIcon } from '@/shared/lib/icons';
import { Can } from '@/features/auth';
import { useEquipmentList } from '../api/equipment.queries';
import { EQUIPMENT_CATEGORIES, EQUIPMENT_STATUSES } from '../model/equipment-display';
import {
  useEquipmentFilters,
  type CategoryFilter,
  type StatusFilter,
} from '../model/use-equipment-filters';
import { EquipmentDrawer } from './equipment-drawer';
import { EquipmentList } from './equipment-table';

/** Writing a machine means writing its price — the pair the API asks for. */
const MANAGE = [Permission.EQUIPMENT_MANAGE, Permission.BUDGET_MANAGE];

/**
 * The fleet screen — the same shape as the other lists: the four states of a
 * remote list, plus "empty because of a filter".
 */
export function EquipmentListPage() {
  const t = useTranslations('equipment');
  const tCategory = useTranslations('equipmentCategory');
  const tStatus = useTranslations('equipmentStatus');
  const filters = useEquipmentFilters();
  const [editing, setEditing] = useState<IEquipment | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isPending, isError, error, isPlaceholderData } = useEquipmentList(filters.params);

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
        <Can permission={MANAGE}>
          <Button variant="primary" onClick={() => setCreating(true)}>
            <CreateIcon className="size-4 shrink-0" aria-hidden />
            {t('create')}
          </Button>
        </Can>
      </header>

      <EquipmentDrawer
        key={editing?.id ?? 'create'}
        open={drawerOpen}
        equipment={editing}
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
          label={t('categoryFilterLabel')}
          options={[
            { value: 'all', label: t('allCategories') },
            ...EQUIPMENT_CATEGORIES.map((category) => ({
              value: category,
              label: tCategory(category),
            })),
          ]}
          value={filters.category}
          onChange={(event) => filters.setCategory(event.target.value as CategoryFilter)}
        />
        <Select
          label={t('statusFilterLabel')}
          options={[
            { value: 'all', label: t('allStatuses') },
            ...EQUIPMENT_STATUSES.map((status) => ({ value: status, label: tStatus(status) })),
          ]}
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
            <Can permission={MANAGE}>
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
          <EquipmentList equipment={data.items} onEdit={setEditing} />
        </div>
      )}
    </section>
  );
}
