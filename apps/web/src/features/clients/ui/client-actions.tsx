'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { IClient } from '@chantia/shared';
import { ApiError } from '@/shared/api/http-client';
import { Button, ConfirmDialog } from '@/shared/ui';
import { DeleteIcon, EditIcon } from '@/shared/lib/icons';
import { useDeleteClient } from '../api/client.queries';

/**
 * Edit or delete one client — the same pair and rules as the other lists.
 *
 * A refusal to delete is the expected case here, not an accident: a client
 * with current worksites answers 409. That gets its own sentence, which says
 * what to do, instead of the server's message.
 */
export function ClientActions({
  client,
  onEdit,
  compact = false,
}: {
  client: IClient;
  onEdit: () => void;
  compact?: boolean;
}) {
  const t = useTranslations('clients');
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteClient();

  const failure =
    remove.error instanceof ApiError && remove.error.status === 409
      ? t('deleteInUse')
      : remove.error instanceof Error
        ? remove.error.message
        : remove.error
          ? t('actionFailed')
          : null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size={compact ? 'sm' : 'icon'}
          onClick={onEdit}
          title={t('edit')}
          aria-label={compact ? undefined : t('editFor', { name: client.displayName })}
        >
          <EditIcon className="size-4 shrink-0" aria-hidden />
          {compact && <span>{t('edit')}</span>}
        </Button>

        <Button
          variant="ghost"
          size={compact ? 'sm' : 'icon'}
          onClick={() => setConfirming(true)}
          title={t('delete')}
          aria-label={compact ? undefined : t('deleteFor', { name: client.displayName })}
          className="text-danger"
        >
          <DeleteIcon className="size-4 shrink-0" aria-hidden />
          {compact && <span>{t('delete')}</span>}
        </Button>
      </div>

      {failure && (
        <p role="alert" className="max-w-64 text-end text-2xs text-danger">
          {failure}
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        title={t('deleteTitle')}
        description={t('deleteDescription', { name: client.displayName })}
        confirmLabel={t('deleteConfirm')}
        cancelLabel={t('deleteDismiss')}
        tone="danger"
        pending={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          remove.mutate(client.id, {
            onSettled: () => setConfirming(false),
          })
        }
      />
    </div>
  );
}
