'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Permission, translated, type IWorksiteTask } from '@chantia/shared';
import { ApiError } from '@/shared/api/http-client';
import { Alert, Button, ConfirmDialog, Dialog, Field, Select, Skeleton } from '@/shared/ui';
import type { Locale } from '@/shared/i18n/config';
import { usePermission } from '@/features/auth';
import {
  useDeleteWorksitePlan,
  useInitializeWorksitePlan,
  usePlanSources,
  useUpdateWorksiteTask,
  useWorksitePlan,
} from '../api/planning.queries';
import { GanttChart } from './gantt-chart';

const TEMPLATE = 'template:';
const OWN_PLAN = 'plan:';

/** Which message explains a refusal from the API. */
function errorKey(error: unknown): string {
  const code = error instanceof ApiError ? error.fields?.[0]?.code : undefined;
  if (code === 'form.errors.worksitePeriodRequired') {
    return 'errorPeriod';
  }
  if (code === 'form.errors.worksitePlanExists') {
    return 'errorExists';
  }
  if (code === 'form.errors.taskEndBeforeStart') {
    return 'errorDates';
  }
  return 'errorUnknown';
}

function StartPlan({ worksiteId }: { worksiteId: string }) {
  const t = useTranslations('planning');
  const locale = useLocale() as Locale;
  const { templates, organizationPlans } = usePlanSources(true);
  const initialize = useInitializeWorksitePlan(worksiteId);
  const [choice, setChoice] = useState('');

  const options = useMemo(
    () => [
      { value: '', label: t('choosePlan') },
      ...(organizationPlans.data ?? []).map((plan) => ({
        value: `${OWN_PLAN}${plan.id}`,
        label: t('ownPlan', { name: plan.name }),
      })),
      ...(templates.data ?? []).map((template) => ({
        value: `${TEMPLATE}${template.id}`,
        label: translated(template.labels, locale, template.code),
      })),
    ],
    [organizationPlans.data, templates.data, locale, t],
  );

  const start = () =>
    initialize.mutate(
      choice.startsWith(TEMPLATE)
        ? { templateId: choice.slice(TEMPLATE.length), locale }
        : { organizationPlanId: choice.slice(OWN_PLAN.length) },
    );

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <p className="text-sm text-fg-muted">{t('startHint')}</p>
      <Select
        label={t('planLabel')}
        options={options}
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
      />
      {initialize.isError && <Alert tone="danger">{t(errorKey(initialize.error))}</Alert>}
      <div>
        <Button variant="primary" disabled={choice === '' || initialize.isPending} onClick={start}>
          {t('start')}
        </Button>
      </div>
    </div>
  );
}

function EditDates({
  worksiteId,
  task,
  onClose,
}: {
  worksiteId: string;
  task: IWorksiteTask;
  onClose: () => void;
}) {
  const t = useTranslations('planning');
  const update = useUpdateWorksiteTask(worksiteId);
  const [plannedStart, setStart] = useState(task.plannedStart ?? '');
  const [plannedEnd, setEnd] = useState(task.plannedEnd ?? '');

  const save = () =>
    update.mutate({ id: task.id, data: { plannedStart, plannedEnd } }, { onSuccess: onClose });

  return (
    <Dialog
      open
      title={task.label}
      closeLabel={t('close')}
      busy={update.isPending}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button
            variant="primary"
            disabled={update.isPending || plannedStart === '' || plannedEnd === ''}
            onClick={save}
          >
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-stack">
        <div className="grid gap-stack sm:grid-cols-2">
          <Field
            label={t('startDate')}
            type="date"
            required
            value={plannedStart}
            onChange={(event) => setStart(event.target.value)}
          />
          <Field
            label={t('endDate')}
            type="date"
            required
            min={plannedStart}
            value={plannedEnd}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>
        {update.isError && <Alert tone="danger">{t(errorKey(update.error))}</Alert>}
      </div>
    </Dialog>
  );
}

/**
 * A worksite's planning: started from the plan library, then shown as a Gantt
 * chart. Whoever only reads it sees the chart, or that there is none yet.
 */
export function WorksitePlanning({ worksiteId }: { worksiteId: string }) {
  const t = useTranslations('planning');
  const plan = useWorksitePlan(worksiteId);
  const canManage = usePermission(Permission.WORKSITE_MANAGE);
  const remove = useDeleteWorksitePlan(worksiteId);
  const [editing, setEditing] = useState<IWorksiteTask | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (plan.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (plan.isError) {
    return <Alert tone="danger">{t('loadError')}</Alert>;
  }
  const tasks = plan.data?.tasks ?? [];
  if (tasks.length === 0) {
    return canManage ? (
      <StartPlan worksiteId={worksiteId} />
    ) : (
      <p className="text-sm text-fg-muted">{t('empty')}</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {canManage && <p className="text-sm text-fg-muted">{t('proposedHint')}</p>}
      {/* Keyed by shape: a restarted planning opens collapsed again. */}
      <GanttChart key={tasks[0]?.id} tasks={tasks} onEdit={canManage ? setEditing : undefined} />
      {canManage && (
        <div>
          <Button size="sm" onClick={() => setConfirming(true)}>
            {t('restart')}
          </Button>
        </div>
      )}
      {editing && (
        <EditDates worksiteId={worksiteId} task={editing} onClose={() => setEditing(null)} />
      )}
      <ConfirmDialog
        open={confirming}
        title={t('restartTitle')}
        description={t('restartDescription')}
        confirmLabel={t('restartConfirm')}
        cancelLabel={t('cancel')}
        tone="danger"
        pending={remove.isPending}
        onConfirm={() => remove.mutate(undefined, { onSuccess: () => setConfirming(false) })}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
