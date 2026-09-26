'use client';

import { useState, type ComponentType } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Permission, type IEquipment, type IEquipmentAssignment } from '@chantia/shared';
import { Alert, Button, Card, CardBody, ConfirmDialog, Drawer, Field, Skeleton } from '@/shared/ui';
import { DeleteIcon, EditIcon } from '@/shared/lib/icons';
import { formatAmount, formatDate } from '@/shared/lib/format';
import type { Locale } from '@/shared/i18n/config';
import { usePermission } from '@/features/auth';
import { useAssignments, useDeleteAssignment } from '../api/equipment.queries';
import { useAssignmentForm } from '../model/use-assignment-form';

/**
 * What this drawer needs from a worksite picker — and all it knows of one.
 * The picker belongs to the worksites feature; the `/equipment` route hands
 * it in, the same arrangement as the client picker in the worksite drawer.
 */
export interface WorksitePickerProps {
  label: string;
  /** A worksite id, or `''` for none. */
  value: string;
  onChange: (worksiteId: string) => void;
  error?: string;
}

export type WorksitePicker = ComponentType<WorksitePickerProps>;

/**
 * One machine's planning: where it is booked, when, and — for whoever reads
 * budgets — what each stay costs its worksite.
 *
 * Anyone who sees the fleet sees the planning; `equipment:manage` adds the
 * form to book, move and cancel. A machine is never in two places on the same
 * day: the API refuses it, naming the worksite in the way.
 */
export function AssignmentsDrawer({
  equipment,
  onClose,
  WorksitePicker,
}: {
  /** `null` keeps the drawer closed. */
  equipment: IEquipment | null;
  onClose: () => void;
  WorksitePicker?: WorksitePicker;
}) {
  const t = useTranslations('equipment');

  return (
    <Drawer
      open={equipment !== null}
      title={equipment ? t('planningTitle', { name: equipment.designation }) : t('planning')}
      closeLabel={t('close')}
      onClose={onClose}
    >
      {equipment && <Planning equipment={equipment} WorksitePicker={WorksitePicker} />}
    </Drawer>
  );
}

function Planning({
  equipment,
  WorksitePicker,
}: {
  equipment: IEquipment;
  WorksitePicker?: WorksitePicker;
}) {
  const t = useTranslations('equipment');
  const canManage = usePermission(Permission.EQUIPMENT_MANAGE);
  const { data, isPending, isError } = useAssignments({ equipmentId: equipment.id });
  const [editing, setEditing] = useState<IEquipmentAssignment | null>(null);

  return (
    <div className="flex flex-col gap-section">
      {canManage && WorksitePicker && (
        <AssignmentForm
          // Remounted per target, so the boxes start from the right values.
          key={editing?.id ?? 'new'}
          equipment={equipment}
          editing={editing}
          onDone={() => setEditing(null)}
          WorksitePicker={WorksitePicker}
        />
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t('assignments')}</h3>
        {isPending && <Skeleton className="h-16" />}
        {isError && <Alert tone="danger">{t('assignmentsError')}</Alert>}
        {data && data.items.length === 0 && (
          <p className="text-sm text-fg-muted">{t('noAssignment')}</p>
        )}
        {data && data.items.length > 0 && (
          <ul className="flex flex-col gap-2">
            {data.items.map((assignment) => (
              <AssignmentRow
                key={assignment.id}
                assignment={assignment}
                canManage={canManage}
                onEdit={() => setEditing(assignment)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AssignmentRow({
  assignment,
  canManage,
  onEdit,
}: {
  assignment: IEquipmentAssignment;
  canManage: boolean;
  onEdit: () => void;
}) {
  const t = useTranslations('equipment');
  const locale = useLocale() as Locale;
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteAssignment();
  const where = `${assignment.worksite.code} · ${assignment.worksite.name}`;

  return (
    <li>
      <Card>
        <CardBody className="flex items-start justify-between gap-2">
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{where}</p>
            <p className="text-fg-muted">
              {t('period', {
                from: formatDate(assignment.startDate, locale),
                to: formatDate(assignment.endDate, locale),
                days: assignment.days,
              })}
            </p>
            {assignment.cost !== undefined && (
              <p className="text-fg-muted">
                {t('assignmentCost', { amount: formatAmount(assignment.cost, locale, 2) })}
              </p>
            )}
            {assignment.notes && <p className="text-xs text-fg-muted">{assignment.notes}</p>}
            {remove.error && (
              <p role="alert" className="text-2xs text-danger">
                {t('actionFailed')}
              </p>
            )}
          </div>
          {canManage && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                title={t('edit')}
                aria-label={t('moveAssignment', { worksite: where })}
              >
                <EditIcon className="size-4 shrink-0" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirming(true)}
                title={t('cancelAssignment')}
                aria-label={t('cancelAssignmentFor', { worksite: where })}
                className="text-danger"
              >
                <DeleteIcon className="size-4 shrink-0" aria-hidden />
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirming}
        title={t('cancelAssignmentTitle')}
        description={t('cancelAssignmentDescription', { worksite: where })}
        confirmLabel={t('cancelAssignment')}
        cancelLabel={t('deleteDismiss')}
        tone="danger"
        pending={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => remove.mutate(assignment.id, { onSettled: () => setConfirming(false) })}
      />
    </li>
  );
}

function AssignmentForm({
  equipment,
  editing,
  onDone,
  WorksitePicker,
}: {
  equipment: IEquipment;
  editing: IEquipmentAssignment | null;
  onDone: () => void;
  WorksitePicker: WorksitePicker;
}) {
  const t = useTranslations('equipment');
  const tFieldError = useTranslations('form.errors');
  const locale = useLocale() as Locale;
  const form = useAssignmentForm(equipment, editing);
  const error = (field: 'worksiteId' | 'startDate' | 'endDate') =>
    form.fieldErrors[field] && tFieldError(form.fieldErrors[field]);

  return (
    <form
      onSubmit={(event) => {
        void form.submit(event).then((succeeded) => {
          if (succeeded) {
            onDone();
          }
        });
      }}
      className="flex flex-col gap-stack"
    >
      <h3 className="text-sm font-semibold">{editing ? t('moveTitle') : t('assignTitle')}</h3>

      {form.conflict && <Alert tone="danger">{form.conflict}</Alert>}
      {form.failed && <Alert tone="danger">{t('assignmentFailed')}</Alert>}

      <WorksitePicker
        label={t('worksite')}
        value={form.values.worksiteId}
        error={error('worksiteId')}
        onChange={(worksiteId) => form.setValue('worksiteId', worksiteId)}
      />

      <div className="grid gap-stack sm:grid-cols-2">
        <Field
          label={t('startDate')}
          type="date"
          required
          min={form.availableFrom}
          max={form.availableUntil ?? undefined}
          value={form.values.startDate}
          error={error('startDate')}
          onChange={(event) => form.setValue('startDate', event.target.value)}
        />
        <Field
          label={t('endDate')}
          type="date"
          required
          min={form.values.startDate || form.availableFrom}
          max={form.availableUntil ?? undefined}
          value={form.values.endDate}
          error={error('endDate')}
          onChange={(event) => form.setValue('endDate', event.target.value)}
        />
      </div>

      <Field
        label={t('notes')}
        maxLength={1000}
        value={form.values.notes}
        onChange={(event) => form.setValue('notes', event.target.value)}
      />

      {form.previewCost !== null && (
        <p className="rounded-control bg-surface-muted px-3 py-2 text-sm text-fg-muted">
          {t('assignmentPreview', { amount: formatAmount(form.previewCost, locale, 2) })}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {editing && (
          <Button variant="secondary" onClick={onDone} disabled={form.pending}>
            {t('cancel')}
          </Button>
        )}
        <Button
          variant="primary"
          type="submit"
          loading={form.pending}
          disabled={!form.isComplete}
        >
          {editing ? t('save') : t('assign')}
        </Button>
      </div>
    </form>
  );
}
