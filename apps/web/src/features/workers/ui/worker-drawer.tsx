'use client';

import { useTranslations } from 'next-intl';
import type { IWorker } from '@chantia/shared';
import { Alert, Button, Checkbox, Drawer, Field } from '@/shared/ui';
import { useWorkerForm } from '../model/use-worker-form';

/**
 * The form that adds somebody to the payroll, or edits them — one drawer, two
 * doors, chosen by whether `worker` is set.
 *
 * **A drawer, not a centred box.** The list stays visible beside it, matching
 * `InviteDrawer`'s reasoning: a form gets the full height of the screen
 * instead of a box that scrolls inside itself.
 *
 * **No second state to show afterwards.** Unlike an invitation, a worker
 * produces nothing to hand over — the drawer simply closes on success, and
 * the new or changed row appears in the list behind it.
 *
 * **`key` is the caller's job.** This component does not watch `worker` for
 * changes; the page remounts it (keyed by the worker's id, or a constant for
 * "create") when it should start over with different values. See
 * `use-worker-form.ts`.
 */
export function WorkerDrawer({
  open,
  worker = null,
  onClose,
}: {
  open: boolean;
  /** `null` creates; anything else edits that worker. */
  worker?: IWorker | null;
  onClose: () => void;
}) {
  const t = useTranslations('workers');
  const form = useWorkerForm(worker);

  const close = (): void => {
    onClose();
    // After the close, so the form does not blink back to its defaults in
    // front of the reader while the panel is still on screen.
    form.reset();
  };

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
            form="worker-form"
            loading={form.pending}
            disabled={!form.isComplete}
          >
            {t('save')}
          </Button>
        </div>
      }
    >
      {/* The form lives outside the footer, so `form="worker-form"` on the
        * submit button is what ties them — Enter in any field then submits. */}
      <form
        id="worker-form"
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

        <Field
          label={t('name')}
          required
          value={form.values.name}
          onChange={(event) => form.setValue('name', event.target.value)}
        />

        <Field
          label={t('qualification')}
          hint={t('qualificationHint')}
          value={form.values.qualification}
          onChange={(event) => form.setValue('qualification', event.target.value)}
        />

        <Field
          label={t('hourlyRate')}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          required
          hint={t('hourlyRateHint')}
          value={form.values.hourlyRate}
          onChange={(event) => form.setValue('hourlyRate', event.target.value)}
        />

        {/* Only when editing: a new worker starts active, and asking about a
          * state they cannot have yet would be a question with no wrong answer
          * that still has to be answered. */}
        {form.isEditing && (
          <Checkbox
            label={t('activeLabel')}
            hint={t('activeHint')}
            checked={form.values.active}
            onChange={(event) => form.setValue('active', event.target.checked)}
          />
        )}
      </form>
    </Drawer>
  );
}
