'use client';

import { useTranslations } from 'next-intl';
import { Button, Card, CardBody, Checkbox, Field } from '@/shared/ui';
import { DeleteIcon } from '@/shared/lib/icons';
import type { ContactFormValues } from '../model/use-client-form';

type ContactField = 'firstName' | 'lastName' | 'position' | 'mobilePhone' | 'landlinePhone' | 'email';

/**
 * One contact inside the client drawer — a card per person, so a list of
 * three reads as three people rather than eighteen boxes.
 *
 * **"Contact principal" cannot be unticked.** There is always exactly one;
 * the way to change it is to tick another. A box that could be unticked
 * would let the form show "no primary" while the API picks one anyway.
 */
export function ContactFields({
  contact,
  index,
  invalidEmail,
  onChange,
  onRemove,
  onMakePrimary,
}: {
  contact: ContactFormValues;
  index: number;
  invalidEmail: boolean;
  onChange: (field: ContactField, value: string) => void;
  onRemove: () => void;
  onMakePrimary: () => void;
}) {
  const t = useTranslations('clients');
  const tFieldError = useTranslations('form.errors');
  const title = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || t('contactN', { n: index + 1 });

  return (
    <Card>
      <CardBody className="flex flex-col gap-stack">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium">{title}</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            title={t('removeContact')}
            aria-label={t('removeContactFor', { name: title })}
            className="text-danger"
          >
            <DeleteIcon className="size-4 shrink-0" aria-hidden />
          </Button>
        </div>

        <div className="grid gap-stack sm:grid-cols-2">
          <Field
            label={t('contactLastName')}
            required
            maxLength={100}
            value={contact.lastName}
            onChange={(event) => onChange('lastName', event.target.value)}
          />
          <Field
            label={t('contactFirstName')}
            maxLength={100}
            value={contact.firstName}
            onChange={(event) => onChange('firstName', event.target.value)}
          />
        </div>

        <Field
          label={t('position')}
          hint={t('positionHint')}
          maxLength={100}
          value={contact.position}
          onChange={(event) => onChange('position', event.target.value)}
        />

        <div className="grid gap-stack sm:grid-cols-2">
          <Field
            label={t('mobilePhone')}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            maxLength={30}
            placeholder="+216 98 123 456"
            value={contact.mobilePhone}
            onChange={(event) => onChange('mobilePhone', event.target.value)}
          />
          <Field
            label={t('landlinePhone')}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            maxLength={30}
            placeholder="+216 73 123 456"
            value={contact.landlinePhone}
            onChange={(event) => onChange('landlinePhone', event.target.value)}
          />
        </div>

        <Field
          label={t('email')}
          type="email"
          maxLength={200}
          value={contact.email}
          error={invalidEmail ? tFieldError('invalidEmail') : undefined}
          onChange={(event) => onChange('email', event.target.value)}
        />

        <Checkbox
          label={t('primaryContact')}
          hint={t('primaryContactHint')}
          checked={contact.isPrimary}
          disabled={contact.isPrimary}
          onChange={onMakePrimary}
        />
      </CardBody>
    </Card>
  );
}
