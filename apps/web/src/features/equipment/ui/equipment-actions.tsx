'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { IEquipment } from '@chantia/shared';
import { Button, ConfirmDialog } from '@/shared/ui';
import { DeleteIcon, EditIcon } from '@/shared/lib/icons';
import { useDeleteEquipment } from '../api/equipment.queries';

/**
 * Edit or delete one machine. The confirmation steers a sold machine towards
 * "retired" instead: deleting is for a record made by mistake.
 */
export function EquipmentActions({
  equipment,
  onEdit,
  compact = false,
}: {
  equipment: IEquipment;
  onEdit: () => void;
  compact?: boolean;
}) {
  const t = useTranslations('equipment');
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteEquipment();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size={compact ? 'sm' : 'icon'}
          onClick={onEdit}
          title={t('edit')}
          aria-label={compact ? undefined : t('editFor', { name: equipment.designation })}
        >
          <EditIcon className="size-4 shrink-0" aria-hidden />
          {compact && <span>{t('edit')}</span>}
        </Button>
        <Button
          variant="ghost"
          size={compact ? 'sm' : 'icon'}
          onClick={() => setConfirming(true)}
          title={t('delete')}
          aria-label={compact ? undefined : t('deleteFor', { name: equipment.designation })}
          className="text-danger"
        >
          <DeleteIcon className="size-4 shrink-0" aria-hidden />
          {compact && <span>{t('delete')}</span>}
        </Button>
      </div>

      {remove.error && (
        <p role="alert" className="text-2xs text-danger">
          {remove.error instanceof Error ? remove.error.message : t('actionFailed')}
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        title={t('deleteTitle')}
        description={t('deleteDescription', { name: equipment.designation })}
        confirmLabel={t('deleteConfirm')}
        cancelLabel={t('deleteDismiss')}
        tone="danger"
        pending={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => remove.mutate(equipment.id, { onSettled: () => setConfirming(false) })}
      />
    </div>
  );
}
