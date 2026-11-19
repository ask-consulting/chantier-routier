'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Permission, type IOwnMaterial } from '@chantia/shared';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  EmptyState,
  Skeleton,
} from '@/shared/ui';
import { CreateIcon, DeleteIcon, EditIcon } from '@/shared/lib/icons';
import { Can, usePermission } from '@/features/auth';
import { useMaterialCatalog, useOwnMaterialChanges, useOwnMaterials } from '../api/materials.queries';
import { labelOf } from '../model/materials';
import { MaterialDialog } from './material-dialog';

/**
 * The material catalog: the common one, the same for every company, and the
 * materials this company added beside it — under the same categories, so a
 * task's picker shows both together.
 */
export function MaterialsPage() {
  const t = useTranslations('materials');
  const locale = useLocale();
  const canManage = usePermission(Permission.MATERIAL_MANAGE);
  const catalog = useMaterialCatalog();
  const own = useOwnMaterials();
  const changes = useOwnMaterialChanges();
  const [editing, setEditing] = useState<IOwnMaterial | 'new' | null>(null);
  const [removing, setRemoving] = useState<IOwnMaterial | null>(null);

  if (catalog.isPending || own.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!catalog.data || !own.data) {
    return <Alert tone="danger">{t('loadError')}</Alert>;
  }
  const categories = catalog.data;

  return (
    <section className="flex flex-col gap-section">
      <header className="flex flex-wrap items-baseline justify-between gap-stack">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-fg-muted">{t('subtitle')}</p>
        </div>
        <Can permission={Permission.MATERIAL_MANAGE}>
          <Button variant="primary" onClick={() => setEditing('new')}>
            <CreateIcon className="size-4 shrink-0" aria-hidden />
            {t('create')}
          </Button>
        </Can>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const mine = own.data.filter((material) => material.categoryId === category.id);
          return (
            <Card key={category.id}>
              <CardBody className="flex flex-col gap-3">
                <h2 className="font-semibold">{labelOf(category, locale)}</h2>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {category.materials.map((material) => (
                    <li key={material.id} className="flex items-center justify-between gap-3">
                      <span>{labelOf(material, locale)}</span>
                      <span className="text-fg-muted">{t(`units.${material.unit}`)}</span>
                    </li>
                  ))}
                  {mine.map((material) => (
                    <li key={material.id} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        {material.label}
                        <Badge tone="info">{t('own')}</Badge>
                      </span>
                      <span className="flex items-center gap-1 text-fg-muted">
                        {t(`units.${material.unit}`)}
                        {canManage && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={t('editFor', { label: material.label })}
                              onClick={() => setEditing(material)}
                            >
                              <EditIcon className="size-4" aria-hidden />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={t('removeFor', { label: material.label })}
                              onClick={() => setRemoving(material)}
                            >
                              <DeleteIcon className="size-4" aria-hidden />
                            </Button>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {categories.length === 0 && <EmptyState title={t('emptyTitle')} />}

      {editing !== null && (
        <MaterialDialog
          key={editing === 'new' ? 'new' : editing.id}
          catalog={categories}
          material={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        title={t('removeTitle')}
        description={t('removeDescription', { label: removing?.label ?? '' })}
        confirmLabel={t('remove')}
        cancelLabel={t('cancel')}
        tone="danger"
        pending={changes.remove.isPending}
        onConfirm={() =>
          removing && changes.remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })
        }
        onCancel={() => setRemoving(null)}
      />
    </section>
  );
}
