'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { IInvitationListItem } from '@chantia/shared';
import { Badge, Card, CardBody, TD, TH, THead, TRow, Table } from '@/shared/ui';
import { formatDate } from '@/shared/lib/format';
import type { Locale } from '@/shared/i18n/config';
import { INVITATION_STATUS_TONE } from '../model/invitation-display';
import { InvitationActions } from './invitation-actions';

/**
 * The rows, in two shapes, because a table is not a mobile layout.
 *
 * **Below `md`, cards; above, a table.** A five-column table on a 390px screen
 * either scrolls sideways — hiding the actions, which are the last column — or
 * squeezes each cell to two words. The cards carry exactly the same information
 * in reading order: who, where it stands, until when, what you can do.
 *
 * Both are rendered and one is hidden by CSS rather than switched on a
 * `matchMedia` hook: the choice then happens during layout instead of after
 * hydration, so there is no flash of the wrong one and no bug that only appears
 * on a slow phone.
 */
export function InvitationList({ invitations }: { invitations: IInvitationListItem[] }) {
  return (
    <>
      <div className="md:hidden">
        <InvitationCards invitations={invitations} />
      </div>
      <div className="hidden md:block">
        <InvitationTable invitations={invitations} />
      </div>
    </>
  );
}

function InvitationTable({ invitations }: { invitations: IInvitationListItem[] }) {
  const t = useTranslations('invitations');
  const tStatus = useTranslations('invitationStatus');
  const locale = useLocale() as Locale;

  return (
    <Table>
      <THead>
        <tr>
          <TH>{t('name')}</TH>
          <TH>{t('email')}</TH>
          <TH>{t('status')}</TH>
          <TH>{t('expiresAt')}</TH>
          {/* The header of an actions column says nothing useful out loud, and
            * an empty `<th>` is announced as "blank". */}
          <TH>
            <span className="sr-only">{t('actions')}</span>
          </TH>
        </tr>
      </THead>
      <tbody>
        {invitations.map((invitation) => (
          <TRow key={invitation.id}>
            <TD className="font-medium">
              {invitation.firstName} {invitation.lastName}
            </TD>
            <TD className="text-fg-muted">{invitation.email}</TD>
            <TD>
              <Badge tone={INVITATION_STATUS_TONE[invitation.status]} dot>
                {tStatus(invitation.status)}
              </Badge>
            </TD>
            <TD className="text-fg-muted">{formatDate(invitation.expiresAt, locale)}</TD>
            <TD>
              <InvitationActions invitation={invitation} />
            </TD>
          </TRow>
        ))}
      </tbody>
    </Table>
  );
}

function InvitationCards({ invitations }: { invitations: IInvitationListItem[] }) {
  const t = useTranslations('invitations');
  const tStatus = useTranslations('invitationStatus');
  const locale = useLocale() as Locale;

  return (
    <ul className="flex flex-col gap-2">
      {invitations.map((invitation) => (
        <li key={invitation.id}>
          <Card>
            <CardBody className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {invitation.firstName} {invitation.lastName}
                  </p>
                  <p className="truncate text-sm text-fg-muted">{invitation.email}</p>
                </div>
                <Badge tone={INVITATION_STATUS_TONE[invitation.status]} dot>
                  {tStatus(invitation.status)}
                </Badge>
              </div>

              <p className="text-xs text-fg-muted">
                {t('expiresOn', { date: formatDate(invitation.expiresAt, locale) })}
              </p>

              <InvitationActions invitation={invitation} compact />
            </CardBody>
          </Card>
        </li>
      ))}
    </ul>
  );
}
