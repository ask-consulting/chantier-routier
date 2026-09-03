'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { IWorker } from '@chantia/shared';
import { Button, ConfirmDialog } from '@/shared/ui';
import { DeleteIcon, EditIcon } from '@/shared/lib/icons';
import { useDeleteWorker } from '../api/worker.queries';

/**
 * The two things an admin can do to a row: edit it, or delete it.
 *
 * **Every row gets both** — unlike an invitation, a worker has no state that
 * makes an action stop applying. Deleting an inactive worker is exactly as
 * valid as deleting an active one; only a soft-deleted worker would be
 * excluded, and one never reaches this list at all (the API filters it out).
 *
 * **Deleting asks first, editing does not.** Editing is reversible from this
 * same screen a moment later; deleting is not reachable through the UI again —
 * the API keeps the row for the cost history, but there is no "undelete"
 * button here.
 */
export function WorkerActions({
  worker,
  onEdit,
  compact = false,
}: {
  worker: IWorker;
  onEdit: () => void;
  /** Labels beside the icons — the phone card has the room the table row lacks. */
  compact?: boolean;
}) {
  const t = useTranslations('workers');
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteWorker();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size={compact ? 'sm' : 'icon'}
          onClick={onEdit}
          title={t('edit')}
          aria-label={compact ? undefined : t('editFor', { name: worker.name })}
        >
          <EditIcon className="size-4 shrink-0" aria-hidden />
          {compact && <span>{t('edit')}</span>}
        </Button>

        <Button
          variant="ghost"
          size={compact ? 'sm' : 'icon'}
          onClick={() => setConfirming(true)}
          title={t('delete')}
          aria-label={compact ? undefined : t('deleteFor', { name: worker.name })}
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
        // What will happen, not "are you sure": the person disappears from
        // every list, but their recorded hours — and the worksites they cost —
        // stay exactly as they were.
        description={t('deleteDescription', { name: worker.name })}
        confirmLabel={t('deleteConfirm')}
        cancelLabel={t('deleteDismiss')}
        tone="danger"
        pending={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          remove.mutate(worker.id, {
            // Closed on failure too: the error belongs next to the row, and a
            // dialog stuck open over it hides the very thing it is reporting.
            onSettled: () => setConfirming(false),
          })
        }
      />
    </div>
  );
}
