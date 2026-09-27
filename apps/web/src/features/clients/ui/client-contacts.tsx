'use client';

import { useTranslations } from 'next-intl';
import { Permission, type IClientContact } from '@chantia/shared';
import { Alert, Badge, Skeleton } from '@/shared/ui';
import { EmailIcon, LandlinePhoneIcon, MobilePhoneIcon } from '@/shared/lib/icons';
import { usePermission } from '@/features/auth';
import { useClient } from '../api/client.queries';

function dial(number: string): string {
  return `tel:${number.replace(/[^0-9+]/g, '')}`;
}

/**
 * A client's contacts, for a worksite's page — who to call at the town hall
 * when the site needs it. Every number is a link: tapped on a phone, it dials.
 *
 * Shown only to a reader with `client:read`; without it the API would refuse
 * anyway, and a panel saying so helps nobody.
 */
export function ClientContacts({ clientId }: { clientId: string }) {
  const t = useTranslations('clients');
  const mayRead = usePermission(Permission.CLIENT_READ);
  const { data, isPending, isError } = useClient(mayRead ? clientId : '');

  if (!mayRead) {
    return null;
  }
  if (isPending) {
    return <Skeleton className="h-16" />;
  }
  if (isError) {
    return <Alert tone="danger">{t('contactsError')}</Alert>;
  }
  if (data.contacts.length === 0) {
    return <p className="text-sm text-fg-muted">{t('noContact')}</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {data.contacts.map((contact) => (
        <ContactRow key={contact.id} contact={contact} />
      ))}
    </ul>
  );
}

function ContactRow({ contact }: { contact: IClientContact }) {
  const t = useTranslations('clients');
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ');

  return (
    <li className="flex flex-col gap-1 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{name}</span>
        {contact.isPrimary && <Badge tone="info">{t('primaryContact')}</Badge>}
      </div>
      {contact.position && <span className="text-fg-muted">{contact.position}</span>}
      <div className="flex flex-wrap gap-x-4 gap-y-1" dir="ltr">
        {contact.mobilePhone && (
          <a href={dial(contact.mobilePhone)} className="inline-flex items-center gap-1 hover:text-primary">
            <MobilePhoneIcon className="size-3.5 shrink-0" aria-hidden />
            {contact.mobilePhone}
          </a>
        )}
        {contact.landlinePhone && (
          <a href={dial(contact.landlinePhone)} className="inline-flex items-center gap-1 hover:text-primary">
            <LandlinePhoneIcon className="size-3.5 shrink-0" aria-hidden />
            {contact.landlinePhone}
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 hover:text-primary">
            <EmailIcon className="size-3.5 shrink-0" aria-hidden />
            {contact.email}
          </a>
        )}
      </div>
    </li>
  );
}
