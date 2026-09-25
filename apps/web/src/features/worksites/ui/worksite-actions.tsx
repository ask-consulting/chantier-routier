'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { IWorksite } from '@chantia/shared';
import { Button, ConfirmDialog } from '@/shared/ui';
import { DeleteIcon, EditIcon } from '@/shared/lib/icons';
import { useDeleteWorksite } from '../api/worksite.queries';

/**
 * Edit or delete one worksite — the same pair, and the same rules, as
 * `WorkerActions`: every row gets both, deleting asks first, editing does not.
 *
 * The confirmation points at the status instead: a finished or paused site is
 * `completed` or `suspended`, and stays listed with its costs. Deleting is for
 * one created by mistake.
 */
export function WorksiteActions({
  worksite,
  onEdit,
  compact = false,
}: {
  worksite: IWorksite;
  onEdit: () => void;
  /** Labels beside the icons — the phone card has the room the table row lacks. */
  compact?: boolean;
}) {
  const t = useTranslations('worksites');
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteWorksite();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size={compact ? 'sm' : 'icon'}
          onClick={onEdit}
          title={t('edit')}
          aria-label={compact ? undefined : t('editFor', { name: worksite.name })}
        >
          <EditIcon className="size-4 shrink-0" aria-hidden />
          {compact && <span>{t('edit')}</span>}
        </Button>

        <Button
          variant="ghost"
          size={compact ? 'sm' : 'icon'}
          onClick={() => setConfirming(true)}
          title={t('delete')}
          aria-label={compact ? undefined : t('deleteFor', { name: worksite.name })}
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
        description={t('deleteDescription', { name: worksite.name })}
        confirmLabel={t('deleteConfirm')}
        cancelLabel={t('deleteDismiss')}
        tone="danger"
        pending={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          remove.mutate(worksite.id, {
            // Closed on failure too: the error belongs next to the row.
            onSettled: () => setConfirming(false),
          })
        }
      />
    </div>
  );
}
