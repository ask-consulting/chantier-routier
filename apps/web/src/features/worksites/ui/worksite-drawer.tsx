'use client';

import { useTranslations } from 'next-intl';
import { Permission, type IWorksite, type WorksiteStatus } from '@chantia/shared';
import { Alert, Button, Drawer, Field, Select } from '@/shared/ui';
import { usePermission } from '@/features/auth';
import { WORKSITE_STATUS } from '../model/worksite-display';
import { useWorksiteForm } from '../model/use-worksite-form';

/**
 * The form that creates a worksite, or edits one — one drawer, two doors,
 * chosen by whether `worksite` is set. Same arrangement as `WorkerDrawer`: the
 * list stays visible beside it, success closes it, and the page remounts it
 * with a `key` when the target changes.
 *
 * **The budget field needs `budget:manage`.** Everyone who may manage a
 * worksite holds it today; the check is here so a later re-balancing of roles
 * cannot turn this form into a way to overwrite a figure its user cannot see.
 */
export function WorksiteDrawer({
  open,
  worksite = null,
  onClose,
}: {
  open: boolean;
  /** `null` creates; anything else edits that worksite. */
  worksite?: IWorksite | null;
  onClose: () => void;
}) {
  const t = useTranslations('worksites');
  const tStatus = useTranslations('worksiteStatus');
  const tFieldError = useTranslations('form.errors');
  const withBudget = usePermission(Permission.BUDGET_MANAGE);
  const form = useWorksiteForm(worksite, { withBudget });

  const close = (): void => {
    onClose();
    // After the close, so the form does not blink back to its defaults while
    // the panel is still on screen.
    form.reset();
  };

  const statusOptions = WORKSITE_STATUS.map((status) => ({ value: status, label: tStatus(status) }));

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
            form="worksite-form"
            loading={form.pending}
            disabled={!form.isComplete}
          >
            {t('save')}
          </Button>
        </div>
      }
    >
      <form
        id="worksite-form"
        onSubmit={(event) => {
          void form.submit(event).then((succeeded) => {
            if (succeeded) {
              close();
            }
          });
        }}
        className="flex flex-col gap-stack"
      >
        {form.error && <Alert tone="danger">{t(`error.${form.error}`)}</Alert>}

        <div className="grid gap-stack sm:grid-cols-[10rem_1fr]">
          <Field
            label={t('code')}
            required
            maxLength={50}
            hint={t('codeHint')}
            value={form.values.code}
            error={form.fieldErrors.code && tFieldError(form.fieldErrors.code)}
            onChange={(event) => form.setValue('code', event.target.value)}
          />
          <Field
            label={t('name')}
            required
            maxLength={200}
            value={form.values.name}
            onChange={(event) => form.setValue('name', event.target.value)}
          />
        </div>

        <Field
          label={t('client')}
          value={form.values.client}
          onChange={(event) => form.setValue('client', event.target.value)}
        />

        <Field
          label={t('address')}
          value={form.values.address}
          onChange={(event) => form.setValue('address', event.target.value)}
        />

        <div className="grid gap-stack sm:grid-cols-2">
          <Field
            label={t('plannedStartDate')}
            type="date"
            value={form.values.plannedStartDate}
            onChange={(event) => form.setValue('plannedStartDate', event.target.value)}
          />
          <Field
            label={t('plannedEndDate')}
            type="date"
            min={form.values.plannedStartDate || undefined}
            value={form.values.plannedEndDate}
            error={
              form.fieldErrors.plannedEndDate && tFieldError(form.fieldErrors.plannedEndDate)
            }
            onChange={(event) => form.setValue('plannedEndDate', event.target.value)}
          />
        </div>

        <Select
          label={t('status')}
          options={statusOptions}
          value={form.values.status}
          onChange={(event) => form.setValue('status', event.target.value as WorksiteStatus)}
        />

        {withBudget && (
          <Field
            label={t('budget')}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            hint={t('budgetHint')}
            value={form.values.totalBudget}
            onChange={(event) => form.setValue('totalBudget', event.target.value)}
          />
        )}
      </form>
    </Drawer>
  );
}
