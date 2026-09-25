'use client';

import { useTranslations } from 'next-intl';
import { Permission, type IClient, type IClientContact } from '@chantia/shared';
import { Badge, Card, CardBody, TD, TH, THead, TRow, Table } from '@/shared/ui';
import { LandlinePhoneIcon, MobilePhoneIcon } from '@/shared/lib/icons';
import { usePermission } from '@/features/auth';
import { ClientActions } from './client-actions';

interface RowsProps {
  clients: IClient[];
  onEdit: (client: IClient) => void;
}

/**
 * The rows, as a table from `md` and cards below — the split every list here
 * makes. The primary contact is shown with a number to dial, because "who do
 * I call at the town hall" is the question this list gets asked most.
 *
 * Actions only with `client:manage`: a foreman reads the file, and a button
 * that answers 403 is worse than no button.
 */
export function ClientList({ clients, onEdit }: RowsProps) {
  return (
    <>
      <div className="md:hidden">
        <ClientCards clients={clients} onEdit={onEdit} />
      </div>
      <div className="hidden md:block">
        <ClientTable clients={clients} onEdit={onEdit} />
      </div>
    </>
  );
}

function primaryOf(client: IClient): IClientContact | null {
  return client.contacts.find((contact) => contact.isPrimary) ?? null;
}

/** A number is a link on a phone: tapping it dials. */
function PhoneLink({ contact }: { contact: IClientContact }) {
  const number = contact.mobilePhone ?? contact.landlinePhone;
  if (!number) {
    return null;
  }
  const Icon = contact.mobilePhone ? MobilePhoneIcon : LandlinePhoneIcon;
  return (
    <a
      href={`tel:${number.replace(/[^0-9+]/g, '')}`}
      className="inline-flex items-center gap-1 text-fg-muted hover:text-fg"
      dir="ltr"
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {number}
    </a>
  );
}

function contactName(contact: IClientContact): string {
  return [contact.firstName, contact.lastName].filter(Boolean).join(' ');
}

function ClientTable({ clients, onEdit }: RowsProps) {
  const t = useTranslations('clients');
  const tType = useTranslations('clientType');
  const canManage = usePermission(Permission.CLIENT_MANAGE);

  return (
    <Table>
      <THead>
        <tr>
          <TH>{t('name')}</TH>
          <TH>{t('type')}</TH>
          <TH>{t('city')}</TH>
          <TH>{t('primaryContact')}</TH>
          {canManage && (
            <TH>
              <span className="sr-only">{t('actions')}</span>
            </TH>
          )}
        </tr>
      </THead>
      <tbody>
        {clients.map((client) => {
          const primary = primaryOf(client);
          return (
            <TRow key={client.id}>
              <TD className="font-medium">{client.displayName}</TD>
              <TD>
                <Badge tone="neutral">{tType(client.type)}</Badge>
              </TD>
              <TD className="text-fg-muted">{client.billingAddress.city ?? '—'}</TD>
              <TD>
                {primary ? (
                  <div className="flex flex-col text-sm">
                    <span>{contactName(primary)}</span>
                    <PhoneLink contact={primary} />
                  </div>
                ) : (
                  <span className="text-fg-muted">—</span>
                )}
              </TD>
              {canManage && (
                <TD>
                  <ClientActions client={client} onEdit={() => onEdit(client)} />
                </TD>
              )}
            </TRow>
          );
        })}
      </tbody>
    </Table>
  );
}

function ClientCards({ clients, onEdit }: RowsProps) {
  const t = useTranslations('clients');
  const tType = useTranslations('clientType');
  const canManage = usePermission(Permission.CLIENT_MANAGE);

  return (
    <ul className="flex flex-col gap-2">
      {clients.map((client) => {
        const primary = primaryOf(client);
        return (
          <li key={client.id}>
            <Card>
              <CardBody className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{client.displayName}</p>
                    <p className="truncate text-sm text-fg-muted">
                      {client.billingAddress.city ?? t('noCity')}
                    </p>
                  </div>
                  <Badge tone="neutral">{tType(client.type)}</Badge>
                </div>

                {primary && (
                  <div className="flex flex-col text-sm">
                    <span>{contactName(primary)}</span>
                    <PhoneLink contact={primary} />
                  </div>
                )}

                {canManage && (
                  <ClientActions client={client} onEdit={() => onEdit(client)} compact />
                )}
              </CardBody>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
