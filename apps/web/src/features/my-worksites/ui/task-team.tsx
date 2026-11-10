'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  defaultTaskRate,
  PayMode,
  Permission,
  PlanNodeLevel,
  type IMyWorksite,
  type ITaskTeam,
  type IWorksiteTask,
} from '@chantia/shared';
import { ApiError } from '@/shared/api/http-client';
import {
  Alert,
  Button,
  ButtonLink,
  Dialog,
  EmptyState,
  Field,
  Select,
  Skeleton,
} from '@/shared/ui';
import { CloseIcon, RollerIcon, WorkerIcon } from '@/shared/lib/icons';
import { formatAmount } from '@/shared/lib/format';
import { fromStoredAmount, toStoredAmount } from '@/shared/lib/currency';
import type { Locale } from '@/shared/i18n/config';
import { usePermission } from '@/features/auth';
import {
  useActiveWorkers,
  useAssignments,
  usePlan,
  useTaskTeam,
  useTaskTeamChanges,
} from '../api/my-worksites.queries';
import { currentPhaseIndex } from '../model/my-worksites';

const PAY_MODES = [PayMode.TASK, PayMode.DAY, PayMode.HOUR];

/** The message for a refusal of the API. */
function errorKey(error: unknown): string {
  const code = error instanceof ApiError ? error.fields?.[0]?.code : undefined;
  switch (code) {
    case 'form.errors.alreadyOnTask':
      return 'teamErrors.already';
    case 'form.errors.taskRateRequired':
      return 'teamErrors.rateRequired';
    case 'form.errors.equipmentNotOnWorksite':
      return 'teamErrors.notOnWorksite';
    default:
      return 'saveError';
  }
}

function AssignDialog({
  worksiteId,
  task,
  onClose,
}: {
  worksiteId: string;
  task: IWorksiteTask;
  onClose: () => void;
}) {
  const t = useTranslations('myWorksites');
  const seesMoney = usePermission(Permission.BUDGET_READ);
  const seesEquipment = usePermission(Permission.EQUIPMENT_READ);
  const workers = useActiveWorkers(true);
  const bookings = useAssignments(worksiteId, seesEquipment);
  const changes = useTaskTeamChanges(worksiteId);
  const [workerId, setWorkerId] = useState('');
  const [payMode, setPayMode] = useState<PayMode>(PayMode.DAY);
  const [rate, setRate] = useState('');
  const [bookingId, setBookingId] = useState('');

  const worker = workers.data?.find((candidate) => candidate.id === workerId);
  const proposed = worker ? defaultTaskRate(payMode, worker.hourlyRate) : null;
  const typed = rate.trim() === '' ? null : Number(rate.replace(',', '.'));
  const rateOk =
    typed === null ? payMode !== PayMode.TASK || !seesMoney : Number.isFinite(typed) && typed >= 0;

  const addWorker = () =>
    changes.assignWorker.mutate(
      {
        taskId: task.id,
        data: { workerId, payMode, ...(typed === null ? {} : { rate: toStoredAmount(typed) }) },
      },
      {
        onSuccess: () => {
          setWorkerId('');
          setRate('');
        },
      },
    );
  const addMachine = () =>
    changes.linkEquipment.mutate(
      { taskId: task.id, bookingId },
      { onSuccess: () => setBookingId('') },
    );

  return (
    <Dialog
      open
      title={t('assignTitle', { label: task.label })}
      closeLabel={t('close')}
      onClose={onClose}
    >
      <div className="flex flex-col gap-section">
        <section className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <WorkerIcon className="size-4" aria-hidden />
            {t('addWorker')}
          </h3>
          {workers.isPending && <Skeleton className="h-10 w-full" />}
          <Select
            label={t('worker')}
            options={[
              { value: '', label: t('chooseWorker') },
              ...(workers.data ?? []).map((w) => ({
                value: w.id,
                label: w.qualification ? `${w.name} · ${w.qualification}` : w.name,
              })),
            ]}
            value={workerId}
            onChange={(event) => setWorkerId(event.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label={t('payMode')}
              options={PAY_MODES.map((mode) => ({ value: mode, label: t(`pay.${mode}`) }))}
              value={payMode}
              onChange={(event) => setPayMode(event.target.value as PayMode)}
            />
            {seesMoney && (
              <Field
                label={t(`rateLabel.${payMode}`)}
                inputMode="decimal"
                placeholder={proposed === null ? '' : String(fromStoredAmount(proposed))}
                hint={payMode === PayMode.TASK ? t('rateRequiredHint') : t('rateDefaultHint')}
                value={rate}
                onChange={(event) => setRate(event.target.value)}
              />
            )}
          </div>
          {changes.assignWorker.isError && (
            <Alert tone="danger">{t(errorKey(changes.assignWorker.error))}</Alert>
          )}
          <div>
            <Button
              variant="primary"
              disabled={!workerId || !rateOk || changes.assignWorker.isPending}
              onClick={addWorker}
            >
              {t('addWorker')}
            </Button>
          </div>
        </section>

        {seesEquipment && (
          <section className="flex flex-col gap-3 border-t border-border pt-section">
            <h3 className="flex items-center gap-2 font-semibold">
              <RollerIcon className="size-4" aria-hidden />
              {t('addMachine')}
            </h3>
            {bookings.data?.length === 0 ? (
              <p className="text-sm text-fg-muted">{t('noEquipment')}</p>
            ) : (
              <Select
                label={t('machine')}
                options={[
                  { value: '', label: t('chooseMachine') },
                  ...(bookings.data ?? []).map((booking) => ({
                    value: booking.id,
                    label: booking.equipment.designation,
                  })),
                ]}
                value={bookingId}
                onChange={(event) => setBookingId(event.target.value)}
              />
            )}
            {changes.linkEquipment.isError && (
              <Alert tone="danger">{t(errorKey(changes.linkEquipment.error))}</Alert>
            )}
            <div>
              <Button disabled={!bookingId || changes.linkEquipment.isPending} onClick={addMachine}>
                {t('addMachine')}
              </Button>
            </div>
          </section>
        )}
      </div>
    </Dialog>
  );
}

function TaskRow({
  worksiteId,
  task,
  depth,
  team,
  onAssign,
}: {
  worksiteId: string;
  task: IWorksiteTask;
  depth: number;
  team: ITaskTeam;
  onAssign: (task: IWorksiteTask) => void;
}) {
  const t = useTranslations('myWorksites');
  const locale = useLocale() as Locale;
  const canManage = usePermission(Permission.WORKSITE_MANAGE);
  const changes = useTaskTeamChanges(worksiteId);
  const workers = team.workers.filter((w) => w.taskId === task.id);
  const machines = team.equipment.filter((m) => m.taskId === task.id);
  const chip = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium';

  return (
    <li
      className="flex flex-col gap-2 border-t border-border py-3 first:border-t-0"
      style={{ paddingInlineStart: `${depth}rem` }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={depth === 0 ? 'font-semibold' : 'text-sm font-medium'}>{task.label}</span>
        {canManage && (
          <Button
            size="sm"
            onClick={() => onAssign(task)}
            aria-label={t('assignFor', { label: task.label })}
          >
            {t('assign')}
          </Button>
        )}
      </div>
      {workers.length + machines.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {workers.map((w) => (
            <li key={w.id} className={`${chip} bg-primary-subtle text-primary-on-subtle`}>
              <WorkerIcon className="size-3.5" aria-hidden />
              {w.workerName} · {t(`pay.${w.payMode}`)}
              {w.rate !== undefined && ` · ${formatAmount(w.rate, locale, 3)}`}
              {canManage && (
                <button
                  type="button"
                  aria-label={t('removeFrom', { name: w.workerName, label: task.label })}
                  onClick={() => changes.removeWorker.mutate(w.id)}
                >
                  <CloseIcon className="size-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
          {machines.map((m) => (
            <li key={m.id} className={`${chip} bg-neutral-subtle text-neutral-on-subtle`}>
              <RollerIcon className="size-3.5" aria-hidden />
              {m.designation}
              {canManage && (
                <button
                  type="button"
                  aria-label={t('removeFrom', { name: m.designation, label: task.label })}
                  onClick={() => changes.unlinkEquipment.mutate(m.id)}
                >
                  <CloseIcon className="size-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Who and what works on each task of a phase, and putting them there. */
export function TaskTeam({ worksite }: { worksite: IMyWorksite }) {
  const t = useTranslations('myWorksites');
  const plan = usePlan(worksite.id);
  const team = useTaskTeam(worksite.id);
  const [phaseIndex, setPhaseIndex] = useState(() => currentPhaseIndex(worksite));
  const [assigning, setAssigning] = useState<IWorksiteTask | null>(null);

  if (plan.isPending || team.isPending) {
    return <Skeleton className="h-40 w-full" />;
  }
  const phases = plan.data?.tasks ?? [];
  if (phases.length === 0) {
    return (
      <EmptyState
        title={t('noPlanTitle')}
        description={t('noPlanDescription')}
        action={<ButtonLink href={`/worksites/${worksite.id}`}>{t('openPlanning')}</ButtonLink>}
      />
    );
  }
  const phase = phases[Math.min(phaseIndex, phases.length - 1)];
  const rows = (phase?.children ?? []).flatMap((task) => [
    { task, depth: 0 },
    ...task.children
      .filter((child) => child.level === PlanNodeLevel.SUBTASK)
      .map((child) => ({ task: child, depth: 1 })),
  ]);

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-60 flex-1 sm:max-w-sm">
          <Select
            label={t('phase')}
            options={phases.map((p, index) => ({ value: String(index), label: p.label }))}
            value={String(phaseIndex)}
            onChange={(event) => setPhaseIndex(Number(event.target.value))}
          />
        </div>
        <p className="text-sm text-fg-muted">{t('tasksHint')}</p>
      </div>
      {team.data && (
        <ul>
          {rows.map(({ task, depth }) => (
            <TaskRow
              key={task.id}
              worksiteId={worksite.id}
              task={task}
              depth={depth}
              team={team.data}
              onAssign={setAssigning}
            />
          ))}
        </ul>
      )}
      {assigning && (
        <AssignDialog
          worksiteId={worksite.id}
          task={assigning}
          onClose={() => setAssigning(null)}
        />
      )}
    </div>
  );
}
