'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  MATERIAL_UNITS,
  MaterialUnit,
  type IMaterialCategory,
  type IOwnMaterial,
} from '@chantia/shared';
import { ApiError } from '@/shared/api/http-client';
import { Alert, Button, Dialog, Field, Select } from '@/shared/ui';
import { useOwnMaterialChanges } from '../api/materials.queries';
import { labelOf } from '../model/materials';

/** The message for a refusal of the API. */
export function materialErrorKey(error: unknown): string {
  const code = error instanceof ApiError ? error.fields?.[0]?.code : undefined;
  switch (code) {
    case 'form.errors.materialLabelTaken':
      return 'errors.labelTaken';
    case 'form.errors.materialUnitInUse':
      return 'errors.unitInUse';
    default:
      return 'errors.save';
  }
}

/** Adds a material of the organization's own, or changes one. */
export function MaterialDialog({
  catalog,
  material,
  onClose,
}: {
  catalog: readonly IMaterialCategory[];
  /** `null` to add one. */
  material: IOwnMaterial | null;
  onClose: () => void;
}) {
  const t = useTranslations('materials');
  const locale = useLocale();
  const changes = useOwnMaterialChanges();
  const [categoryId, setCategoryId] = useState(material?.categoryId ?? catalog[0]?.id ?? '');
  const [label, setLabel] = useState(material?.label ?? '');
  const [unit, setUnit] = useState<MaterialUnit>(material?.unit ?? MaterialUnit.CUBIC_METRE);
  const mutation = material ? changes.update : changes.create;
  const valid = label.trim() !== '' && categoryId !== '';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const data = { categoryId, label: label.trim(), unit };
    if (material) {
      changes.update.mutate({ id: material.id, data }, { onSuccess: onClose });
    } else {
      changes.create.mutate(data, { onSuccess: onClose });
    }
  };

  return (
    <Dialog
      open
      title={material ? t('editTitle') : t('createTitle')}
      closeLabel={t('close')}
      onClose={onClose}
      busy={mutation.isPending}
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field
          label={t('label')}
          value={label}
          maxLength={120}
          required
          onChange={(event) => setLabel(event.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label={t('category')}
            options={catalog.map((category) => ({
              value: category.id,
              label: labelOf(category, locale),
            }))}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          />
          <Select
            label={t('unit')}
            hint={material ? t('unitHint') : undefined}
            options={MATERIAL_UNITS.map((value) => ({ value, label: t(`units.${value}`) }))}
            value={unit}
            onChange={(event) => setUnit(event.target.value as MaterialUnit)}
          />
        </div>
        {mutation.isError && <Alert tone="danger">{t(materialErrorKey(mutation.error))}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={!valid || mutation.isPending}>
            {t('save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
