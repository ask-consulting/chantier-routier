'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ClientType, type IClient } from '@chantia/shared';
import { Alert, Button, Drawer, Field, Select } from '@/shared/ui';
import { CreateIcon } from '@/shared/lib/icons';
import { BILLING_COUNTRIES, CLIENT_TYPES, countryName } from '../model/client-display';
import { useClientForm } from '../model/use-client-form';
import { ContactFields } from './contact-fields';

/**
 * The client file, created or edited in one drawer — identity, billing
 * address, contacts — the same arrangement as the worker and worksite drawers.
 *
 * The name boxes follow the type: a person gets a last and a first name, a
 * legal entity a legal name. The display name the list will show is previewed
 * under them, computed by the same function the API stores.
 */
export function ClientDrawer({
  open,
  client = null,
  onClose,
}: {
  open: boolean;
  /** `null` creates; anything else edits that client. */
  client?: IClient | null;
  onClose: () => void;
}) {
  const t = useTranslations('clients');
  const tType = useTranslations('clientType');
  const locale = useLocale();
  const form = useClientForm(client);
  const isPerson = form.values.type === ClientType.INDIVIDUAL;

  const close = (): void => {
    onClose();
    form.reset();
  };

  const countries = BILLING_COUNTRIES.includes(form.values.country)
    ? BILLING_COUNTRIES
    : [form.values.country, ...BILLING_COUNTRIES];

  return (
    <Drawer
      open={open}
      title={form.isEditing ? t('editTitle') : t('createTitle')}
      closeLabel={t('close')}
      onClose={close}
      busy={form.pending}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={close} disabled={form.pending}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="client-form"
            loading={form.pending}
            disabled={!form.isComplete}
          >
            {t('save')}
          </Button>
        </div>
      }
    >
      <form
        id="client-form"
        onSubmit={(event) => {
          void form.submit(event).then((succeeded) => {
            if (succeeded) {
              close();
            }
          });
        }}
        className="flex flex-col gap-section"
      >
        {form.error && <Alert tone="danger">{t(`error.${form.error}`)}</Alert>}

        <fieldset className="flex flex-col gap-stack">
          <legend className="mb-2 text-sm font-semibold">{t('identity')}</legend>

          <Select
            label={t('type')}
            options={CLIENT_TYPES.map((type) => ({ value: type, label: tType(type) }))}
            value={form.values.type}
            onChange={(event) => form.setValue('type', event.target.value as ClientType)}
          />

          {isPerson ? (
            <div className="grid gap-stack sm:grid-cols-2">
              <Field
                label={t('lastName')}
                required
                maxLength={100}
                value={form.values.lastName}
                onChange={(event) => form.setValue('lastName', event.target.value)}
              />
              <Field
                label={t('firstName')}
                required
                maxLength={100}
                value={form.values.firstName}
                onChange={(event) => form.setValue('firstName', event.target.value)}
              />
            </div>
          ) : (
            <Field
              label={t('legalName')}
              hint={t('legalNameHint')}
              required
              maxLength={200}
              value={form.values.legalName}
              onChange={(event) => form.setValue('legalName', event.target.value)}
            />
          )}

          {form.displayName && (
            <p className="text-xs text-fg-muted">
              {t('displayNamePreview', { name: form.displayName })}
            </p>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-stack">
          <legend className="mb-2 text-sm font-semibold">{t('billingAddress')}</legend>
          <Field
            label={t('line1')}
            maxLength={200}
            value={form.values.line1}
            onChange={(event) => form.setValue('line1', event.target.value)}
          />
          <Field
            label={t('line2')}
            maxLength={200}
            value={form.values.line2}
            onChange={(event) => form.setValue('line2', event.target.value)}
          />
          <div className="grid gap-stack sm:grid-cols-[8rem_1fr]">
            <Field
              label={t('postalCode')}
              inputMode="numeric"
              maxLength={20}
              value={form.values.postalCode}
              onChange={(event) => form.setValue('postalCode', event.target.value)}
            />
            <Field
              label={t('city')}
              maxLength={100}
              value={form.values.city}
              onChange={(event) => form.setValue('city', event.target.value)}
            />
          </div>
          <Select
            label={t('country')}
            options={countries.map((code) => ({ value: code, label: countryName(code, locale) }))}
            value={form.values.country}
            onChange={(event) => form.setValue('country', event.target.value)}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-stack">
          <legend className="mb-2 text-sm font-semibold">
            {t('contacts')} <span className="font-normal text-fg-muted">({form.values.contacts.length})</span>
          </legend>

          {form.values.contacts.length === 0 && (
            <p className="text-sm text-fg-muted">{t('noContact')}</p>
          )}

          {form.values.contacts.map((contact, index) => (
            <ContactFields
              key={contact.key}
              contact={contact}
              index={index}
              invalidEmail={form.invalidEmails.has(contact.key)}
              onChange={(field, value) => form.setContactValue(contact.key, field, value)}
              onRemove={() => form.removeContact(contact.key)}
              onMakePrimary={() => form.setPrimary(contact.key)}
            />
          ))}

          <div>
            <Button variant="secondary" onClick={form.addContact}>
              <CreateIcon className="size-4 shrink-0" aria-hidden />
              {t('addContact')}
            </Button>
          </div>
        </fieldset>
      </form>
    </Drawer>
  );
}
