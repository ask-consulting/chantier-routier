'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { InvitationStatus, isInvitationActionable, type IInvitationListItem } from '@chantia/shared';
import { Button, ConfirmDialog } from '@/shared/ui';
import { DeleteIcon, RefreshIcon } from '@/shared/lib/icons';
import { useCancelInvitation, useResendInvitation } from '../api/invitation.queries';

/**
 * The two things an admin can do to an invitation.
 *
 * **Nothing is rendered for a row that cannot be acted on.** The API refuses a
 * resend or a cancellation on anything but a pending invitation (409), and the
 * rule it uses — `isInvitationActionable` — is the same function imported here,
 * from `@chantia/shared`. Two spellings of "still open" would show a button that
 * answers 409, which is the worst of both.
 *
 * **Cancelling asks first, resending does not.** One is destructive and silent
 * from the invitee's side; the other sends a mail, which is visible, harmless
 * and occasionally wanted twice.
 *
 * Failures are shown here, next to the button that caused them, rather than
 * raised to the page: a resend that fails on one row must not blank a table of
 * twenty.
 */
export function InvitationActions({
  invitation,
  compact = false,
}: {
  invitation: IInvitationListItem;
  /** Labels beside the icons — the phone card has the room the table row lacks. */
  compact?: boolean;
}) {
  const t = useTranslations('invitations');
  const [confirming, setConfirming] = useState(false);
  const resend = useResendInvitation();
  const cancel = useCancelInvitation();

  if (!isInvitationActionable(invitation.status as InvitationStatus)) {
    return null;
  }

  const name = `${invitation.firstName} ${invitation.lastName}`;
  const error = resend.error ?? cancel.error;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size={compact ? 'sm' : 'icon'}
          loading={resend.isPending}
          onClick={() => resend.mutate(invitation.id)}
          title={t('resend')}
          aria-label={compact ? undefined : t('resendFor', { name })}
        >
          {!resend.isPending && <RefreshIcon className="size-4 shrink-0" aria-hidden />}
          {compact && <span>{t('resend')}</span>}
        </Button>

        <Button
          variant="ghost"
          size={compact ? 'sm' : 'icon'}
          onClick={() => setConfirming(true)}
          title={t('cancel')}
          aria-label={compact ? undefined : t('cancelFor', { name })}
          className="text-danger"
        >
          <DeleteIcon className="size-4 shrink-0" aria-hidden />
          {compact && <span>{t('cancel')}</span>}
        </Button>
      </div>

      {resend.isSuccess && !resend.isPending && (
        <p role="status" className="text-2xs text-success-on-subtle">
          {t('resent')}
        </p>
      )}

      {error && (
        <p role="alert" className="text-2xs text-danger">
          {error instanceof Error ? error.message : t('actionFailed')}
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        title={t('cancelTitle')}
        // What will happen, not "are you sure": the link dies, the account does
        // not, and the person can be invited again. All three are things an
        // admin is entitled to know before clicking.
        description={t('cancelDescription', { name })}
        confirmLabel={t('cancelConfirm')}
        cancelLabel={t('cancelDismiss')}
        tone="danger"
        pending={cancel.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          cancel.mutate(invitation.id, {
            // Closed on failure too: the error belongs next to the row, and a
            // dialog stuck open over it hides the very thing it is reporting.
            onSettled: () => setConfirming(false),
          })
        }
      />
    </div>
  );
}
