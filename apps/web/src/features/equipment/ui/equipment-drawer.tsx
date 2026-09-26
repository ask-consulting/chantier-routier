'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  equipmentTypesOf,
  type AcquisitionMethod,
  type EquipmentCategory,
  type EquipmentStatus,
  type IEquipment,
} from '@chantia/shared';
import { Alert, Button, Drawer, Field, Select } from '@/shared/ui';
import { formatAmount, formatDate } from '@/shared/lib/format';
import type { Locale } from '@/shared/i18n/config';
import {
  ACQUISITION_METHODS,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_STATUSES,
} from '../model/equipment-display';
import { useEquipmentForm, type EquipmentFormValues } from '../model/use-equipment-form';

/**
 * A machine of the fleet, created or edited in one drawer — what it is, how it
 * was acquired, where it stands.
 *
 * **The money section follows the acquisition method.** A purchase asks for a
 * price and a lifetime, a lease for a payment and an end, a hire for a daily
 * rate — and shows nothing of the others. What the machine will cost per day,
 * and until when it depreciates, is previewed underneath.
 *
 * **The type comes from the catalog, in two steps** — category, then type —
 * because seventy entries in one list is a list nobody reads. A machine the
 * catalog does not know goes under the category's "Autre", with its own
 * designation.
 */
export function EquipmentDrawer({
  open,
  equipment = null,
  onClose,
}: {
  open: boolean;
  equipment?: IEquipment | null;
  onClose: () => void;
}) {
  const t = useTranslations('equipment');
  const tCategory = useTranslations('equipmentCategory');
  const tType = useTranslations('equipmentType');
  const tMethod = useTranslations('acquisitionMethod');
  const tStatus = useTranslations('equipmentStatus');
  const tFieldError = useTranslations('form.errors');
  const locale = useLocale() as Locale;
  const form = useEquipmentForm(equipment);

  const close = (): void => {
    onClose();
    form.reset();
  };

  /** A text box bound to one field, with its error when it has one. */
  const bound = (field: keyof EquipmentFormValues) => ({
    value: form.values[field],
    error: form.fieldErrors[field] && tFieldError(form.fieldErrors[field]),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      form.setValue(field, event.target.value as never),
  });

  const money = { type: 'number', inputMode: 'decimal' as const, min: '0', step: '0.001' };

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
            form="equipment-form"
            loading={form.pending}
            disabled={!form.isComplete}
          >
            {t('save')}
          </Button>
        </div>
      }
    >
      <form
        id="equipment-form"
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
          <legend className="mb-2 text-sm font-semibold">{t('identification')}</legend>

          <div className="grid gap-stack sm:grid-cols-2">
            <Select
              label={t('category')}
              options={EQUIPMENT_CATEGORIES.map((category) => ({
                value: category,
                label: tCategory(category),
              }))}
              value={form.values.category}
              onChange={(event) =>
                form.setValue('category', event.target.value as EquipmentCategory)
              }
            />
            <Select
              label={t('type')}
              options={[
                { value: '', label: t('pickType') },
                ...equipmentTypesOf(form.values.category).map((type) => ({
                  value: type.code,
                  label: tType(type.code),
                })),
              ]}
              value={form.values.typeCode}
              error={form.fieldErrors.typeCode && tFieldError(form.fieldErrors.typeCode)}
              onChange={(event) => form.setValue('typeCode', event.target.value)}
            />
          </div>

          <Field
            label={t('designation')}
            hint={t('designationHint')}
            required
            maxLength={150}
            {...bound('designation')}
          />

          <div className="grid gap-stack sm:grid-cols-2">
            <Field label={t('fleetNumber')} maxLength={30} {...bound('fleetNumber')} />
            <Field
              label={t('registrationNumber')}
              maxLength={30}
              dir="ltr"
              {...bound('registrationNumber')}
            />
            <Field label={t('brand')} maxLength={60} {...bound('brand')} />
            <Field label={t('model')} maxLength={60} {...bound('model')} />
            <Field label={t('serialNumber')} maxLength={60} dir="ltr" {...bound('serialNumber')} />
            <Field
              label={t('manufactureYear')}
              type="number"
              inputMode="numeric"
              min="1950"
              max="2100"
              {...bound('manufactureYear')}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-stack">
          <legend className="mb-2 text-sm font-semibold">{t('acquisition')}</legend>

          <div className="grid gap-stack sm:grid-cols-2">
            <Select
              label={t('acquisitionMethod')}
              options={ACQUISITION_METHODS.map((method) => ({
                value: method,
                label: tMethod(method),
              }))}
              value={form.values.acquisitionMethod}
              onChange={(event) =>
                form.setValue('acquisitionMethod', event.target.value as AcquisitionMethod)
              }
            />
            <Field
              label={form.owned ? t('purchaseDate') : t('contractStartDate')}
              type="date"
              required
              {...bound('acquisitionDate')}
            />
          </div>

          <Field
            label={form.owned ? t('seller') : t('lessor')}
            maxLength={150}
            {...bound('supplier')}
          />

          {form.owned && (
            <div className="grid gap-stack sm:grid-cols-2">
              <Field
                label={t('purchasePrice')}
                hint={t('purchasePriceHint')}
                required
                {...money}
                {...bound('purchasePrice')}
              />
              <Field
                label={t('residualValue')}
                hint={t('residualValueHint')}
                {...money}
                {...bound('residualValue')}
              />
              <Field
                label={t('usefulLifeMonths')}
                hint={t('usefulLifeHint')}
                required
                type="number"
                inputMode="numeric"
                min="1"
                max="600"
                {...bound('usefulLifeMonths')}
              />
            </div>
          )}

          {form.leased && (
            <div className="grid gap-stack sm:grid-cols-2">
              <Field label={t('monthlyPayment')} required {...money} {...bound('monthlyPayment')} />
              <Field
                label={t('contractEndDate')}
                type="date"
                required
                min={form.values.acquisitionDate || undefined}
                {...bound('contractEndDate')}
              />
              {form.values.acquisitionMethod === 'leasing' && (
                <Field
                  label={t('buyoutValue')}
                  hint={t('buyoutValueHint')}
                  {...money}
                  {...bound('buyoutValue')}
                />
              )}
            </div>
          )}

          {form.hired && (
            <div className="grid gap-stack sm:grid-cols-2">
              <Field label={t('dailyRate')} required {...money} {...bound('dailyRate')} />
              <Field
                label={t('rentalEndDate')}
                hint={t('rentalEndHint')}
                type="date"
                min={form.values.acquisitionDate || undefined}
                {...bound('contractEndDate')}
              />
            </div>
          )}

          {form.preview && (
            <p className="rounded-control bg-surface-muted px-3 py-2 text-sm text-fg-muted">
              {t('dailyCostPreview', {
                amount: formatAmount(form.preview.dailyCost, locale, 2),
              })}
              {form.preview.depreciationEndDate &&
                ` ${t('depreciationEndPreview', {
                  date: formatDate(form.preview.depreciationEndDate, locale),
                })}`}
            </p>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-stack">
          <legend className="mb-2 text-sm font-semibold">{t('state')}</legend>
          <div className="grid gap-stack sm:grid-cols-2">
            <Select
              label={t('status')}
              options={EQUIPMENT_STATUSES.map((status) => ({
                value: status,
                label: tStatus(status),
              }))}
              value={form.values.status}
              onChange={(event) => form.setValue('status', event.target.value as EquipmentStatus)}
            />
            {form.retired && (
              <Field
                label={t('disposalDate')}
                hint={t('disposalDateHint')}
                type="date"
                required
                min={form.values.acquisitionDate || undefined}
                {...bound('disposalDate')}
              />
            )}
          </div>
          <Field label={t('notes')} maxLength={2000} {...bound('notes')} />
        </fieldset>
      </form>
    </Drawer>
  );
}
