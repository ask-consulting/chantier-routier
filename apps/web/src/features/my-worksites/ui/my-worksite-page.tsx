'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Permission, type IMyWorksite, type IWorksiteTask } from '@chantia/shared';
import { ApiError } from '@/shared/api/http-client';
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  Checkbox,
  Dialog,
  EmptyState,
  Select,
  Skeleton,
} from '@/shared/ui';
import { BackIcon, CalendarIcon, ChecklistIcon, RollerIcon, WorkerIcon } from '@/shared/lib/icons';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { Locale } from '@/shared/i18n/config';
import { usePermission } from '@/features/auth';
import {
  useAccounts,
  useAssignments,
  useMembers,
  useMyWorksite,
  usePlan,
  useSetMembers,
  useUpdateProgress,
} from '../api/my-worksites.queries';
import { currentPhaseIndex, entryLines, HEALTH_TONE, span } from '../model/my-worksites';
import { TaskTeam } from './task-team';

type Tab = 'overview' | 'progress' | 'tasks' | 'team' | 'equipment';

function Stat({
  label,
  value,
  sub,
  danger,
}: {
  label: string;
  value: ReactNode;
  sub: ReactNode;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardBody className="py-3.5">
        <p className="text-xs text-fg-muted">{label}</p>
        <p
          className={cn(
            'text-[22px] font-semibold tabular-nums',
            danger && 'text-danger-on-subtle',
          )}
        >
          {value}
        </p>
        <p className="truncate text-xs text-fg-muted">{sub}</p>
      </CardBody>
    </Card>
  );
}

function Phases({ worksite }: { worksite: IMyWorksite }) {
  const t = useTranslations('myWorksites');
  const current = currentPhaseIndex(worksite);
  if (worksite.phases.length === 0) {
    return <p className="text-sm text-fg-muted">{t('noPlan')}</p>;
  }
  const window = {
    start: worksite.plannedStartDate ?? worksite.phases[0]?.plannedStart ?? null,
    end: worksite.plannedEndDate ?? worksite.phases.at(-1)?.plannedEnd ?? null,
  };
  return (
    <ul className="flex flex-col gap-1.5" dir="ltr">
      {worksite.phases.map((phase, index) => {
        const bar = span(phase.plannedStart, phase.plannedEnd, window);
        return (
          <li
            key={`${phase.label}-${index}`}
            className="grid grid-cols-[7rem_minmax(0,1fr)_2.5rem] items-center gap-2.5 sm:grid-cols-[12rem_minmax(0,1fr)_3rem]"
          >
            <span dir="auto" title={phase.label} className="truncate text-sm">
              {phase.label}
            </span>
            <div className="relative h-[22px] rounded bg-surface-muted">
              {bar && (
                <span
                  className={cn(
                    'absolute inset-y-[5px] rounded-sm',
                    phase.progress >= 100
                      ? 'bg-primary'
                      : index === current
                        ? worksite.health === 'late'
                          ? 'bg-danger'
                          : 'bg-primary'
                        : 'bg-fg-subtle',
                  )}
                  style={{ left: `${bar.left}%`, width: `${Math.max(bar.width, 0.5)}%` }}
                />
              )}
            </div>
            <span className="text-end text-xs tabular-nums text-fg-muted">{phase.progress} %</span>
          </li>
        );
      })}
    </ul>
  );
}

function NextSteps({ worksite }: { worksite: IMyWorksite }) {
  const t = useTranslations('myWorksites');
  const locale = useLocale() as Locale;
  if (worksite.nextSteps.length === 0) {
    return <p className="text-sm text-fg-muted">{t('nothingNext')}</p>;
  }
  return (
    <ul>
      {worksite.nextSteps.map((step) => (
        <li
          key={`${step.label}-${step.plannedStart}`}
          className="flex items-center justify-between gap-3 border-t border-border py-3 first:border-t-0"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{step.label}</p>
            <p className="text-sm text-fg-muted">{formatDate(step.plannedStart, locale)}</p>
          </div>
          {step.isControl && <Badge tone="signal">{t('control')}</Badge>}
        </li>
      ))}
    </ul>
  );
}

function ProgressEntry({ worksite }: { worksite: IMyWorksite }) {
  const t = useTranslations('myWorksites');
  const canRecord = usePermission(Permission.PROGRESS_RECORD);
  const plan = usePlan(worksite.id);
  const update = useUpdateProgress();
  const [phaseIndex, setPhaseIndex] = useState(() => currentPhaseIndex(worksite));
  const [draft, setDraft] = useState<Record<string, number>>({});

  if (plan.isPending) {
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
  const phase: IWorksiteTask | undefined = phases[Math.min(phaseIndex, phases.length - 1)];
  const save = (line: IWorksiteTask) => {
    const value = draft[line.id];
    if (value !== undefined && value !== line.progress) {
      update.mutate({ taskId: line.id, progress: value });
    }
  };

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-60 flex-1 sm:max-w-sm">
          <Select
            label={t('phase')}
            options={phases.map((p, index) => ({
              value: String(index),
              label: `${p.label} · ${p.progress} %`,
            }))}
            value={String(phaseIndex)}
            onChange={(event) => setPhaseIndex(Number(event.target.value))}
          />
        </div>
        <p className="text-sm text-fg-muted">{t('progressHint')}</p>
      </div>
      {update.isError && (
        <Alert tone="danger">
          {update.error instanceof ApiError && update.error.status === 404
            ? t('progressForbidden')
            : t('saveError')}
        </Alert>
      )}
      {phase &&
        entryLines(phase).map(({ task, lines }) => (
          <div key={task.id} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-semibold">{task.label}</h3>
              <span className="text-lg font-semibold tabular-nums">{task.progress} %</span>
            </div>
            {lines.map((line) => {
              const value = draft[line.id] ?? line.progress;
              return (
                <div key={line.id} className="flex flex-col gap-1 border-t border-border pt-3">
                  <div className="flex justify-between gap-3 text-sm">
                    <label htmlFor={`progress-${line.id}`} className="font-medium">
                      {line.label}
                      {line.isControl && (
                        <Badge tone="signal" className="ms-2">
                          {t('control')}
                        </Badge>
                      )}
                    </label>
                    <span className="tabular-nums">{value} %</span>
                  </div>
                  <input
                    id={`progress-${line.id}`}
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={value}
                    disabled={!canRecord}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [line.id]: Number(event.target.value) }))
                    }
                    onPointerUp={() => save(line)}
                    onKeyUp={() => save(line)}
                    onBlur={() => save(line)}
                    className="h-6 w-full accent-primary disabled:opacity-60"
                  />
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}

function TeamEditor({
  worksiteId,
  current,
  onClose,
}: {
  worksiteId: string;
  current: string[];
  onClose: () => void;
}) {
  const t = useTranslations('myWorksites');
  const tRole = useTranslations('userRole');
  const accounts = useAccounts(true);
  const save = useSetMembers(worksiteId);
  const [chosen, setChosen] = useState(() => new Set(current));
  const toggle = (id: string) =>
    setChosen((set) => {
      const next = new Set(set);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  return (
    <Dialog
      open
      title={t('editTeam')}
      closeLabel={t('close')}
      busy={save.isPending}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button
            variant="primary"
            disabled={save.isPending || !accounts.data}
            onClick={() => save.mutate([...chosen], { onSuccess: onClose })}
          >
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-fg-muted">{t('teamHint')}</p>
        {accounts.isPending && <Skeleton className="h-24 w-full" />}
        {accounts.isError && <Alert tone="danger">{t('loadError')}</Alert>}
        {accounts.data?.map((account) => (
          <Checkbox
            key={account.id}
            label={`${account.firstName} ${account.lastName}`}
            hint={tRole(account.role)}
            checked={chosen.has(account.id)}
            onChange={() => toggle(account.id)}
          />
        ))}
        {save.isError && <Alert tone="danger">{t('saveError')}</Alert>}
      </div>
    </Dialog>
  );
}

function Team({ worksiteId }: { worksiteId: string }) {
  const t = useTranslations('myWorksites');
  const tRole = useTranslations('userRole');
  const canManage = usePermission(Permission.WORKSITE_MANAGE);
  const members = useMembers(worksiteId);
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setEditing(true)}>
            <WorkerIcon className="size-4 shrink-0" aria-hidden />
            {t('editTeam')}
          </Button>
        </div>
      )}
      {members.isPending && <Skeleton className="h-24 w-full" />}
      {members.data?.length === 0 && <p className="text-sm text-fg-muted">{t('noMembers')}</p>}
      <ul>
        {members.data?.map((member) => (
          <li
            key={member.userId}
            className="flex items-center justify-between gap-3 border-t border-border py-3 first:border-t-0"
          >
            <span className="text-sm font-medium">
              {member.firstName} {member.lastName}
            </span>
            <span className="text-xs text-fg-muted">{tRole(member.role)}</span>
          </li>
        ))}
      </ul>
      {editing && members.data && (
        <TeamEditor
          worksiteId={worksiteId}
          current={members.data.map((member) => member.userId)}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function Equipment({ worksiteId }: { worksiteId: string }) {
  const t = useTranslations('myWorksites');
  const locale = useLocale() as Locale;
  const assignments = useAssignments(worksiteId, true);
  if (assignments.isPending) {
    return <Skeleton className="h-24 w-full" />;
  }
  if (!assignments.data || assignments.data.length === 0) {
    return <p className="text-sm text-fg-muted">{t('noEquipment')}</p>;
  }
  return (
    <ul>
      {assignments.data.map((assignment) => (
        <li
          key={assignment.id}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border py-3 first:border-t-0"
        >
          <span className="text-sm font-medium">{assignment.equipment.designation}</span>
          <span className="text-xs text-fg-muted">
            {formatDate(assignment.startDate, locale)} → {formatDate(assignment.endDate, locale)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** One worksite: where it stands, what to do next, its progress and its team. */
export function MyWorksitePage({ id }: { id: string }) {
  const t = useTranslations('myWorksites');
  const locale = useLocale() as Locale;
  const query = useMyWorksite(id);
  const canRecord = usePermission(Permission.PROGRESS_RECORD);
  const seesEquipment = usePermission(Permission.EQUIPMENT_READ);
  const [tab, setTab] = useState<Tab>('overview');
  const tabs = useMemo<Tab[]>(
    () => [
      'overview',
      'progress',
      'tasks',
      'team',
      ...(seesEquipment ? (['equipment'] as Tab[]) : []),
    ],
    [seesEquipment],
  );

  if (query.isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  const worksite = query.data;
  if (!worksite) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return missing ? (
      <EmptyState
        title={t('notFoundTitle')}
        description={t('notFoundDescription')}
        action={<ButtonLink href="/">{t('back')}</ButtonLink>}
      />
    ) : (
      <Alert tone="danger">{t('loadError')}</Alert>
    );
  }

  const next = worksite.nextSteps[0];
  const enterProgress = (
    <Button variant="primary" className="w-full sm:w-auto" onClick={() => setTab('progress')}>
      <ChecklistIcon className="size-4 shrink-0" aria-hidden />
      {t('enterProgress')}
    </Button>
  );

  return (
    <section className="flex flex-col gap-5">
      <div>
        <ButtonLink href="/" variant="ghost" size="sm" className="-ms-3">
          <BackIcon className="size-4 shrink-0 rtl:rotate-180" aria-hidden />
          {t('back')}
        </ButtonLink>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-fg-muted">{worksite.code}</span>
            <Badge tone={HEALTH_TONE[worksite.health]} dot>
              {t(`health.${worksite.health}`)}
            </Badge>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{worksite.name}</h1>
          <p className="text-fg-muted">{worksite.client ?? t('noClient')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/worksites/${worksite.id}`}>
            <CalendarIcon className="size-4 shrink-0" aria-hidden />
            {t('openPlanning')}
          </ButtonLink>
          {canRecord && <div className="hidden sm:block">{enterProgress}</div>}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label={t('statProgress')}
          value={`${worksite.progress} %`}
          sub={t('statPlanned', { percent: worksite.plannedProgress })}
        />
        <Stat
          label={t('statDelay')}
          value={worksite.delayDays > 0 ? t('days', { count: worksite.delayDays }) : t('noDelay')}
          sub={worksite.phases[currentPhaseIndex(worksite)]?.label ?? '—'}
          danger={worksite.delayDays > 0}
        />
        <Stat
          label={t('statNext')}
          value={next ? formatDate(next.plannedStart, locale) : '—'}
          sub={next?.label ?? t('nothingNext')}
        />
        <Stat label={t('statTeam')} value={worksite.memberCount} sub={t('statTeamSub')} />
      </div>

      <div
        role="tablist"
        aria-label={t('sections')}
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium',
              tab === key
                ? 'border-primary text-primary-on-subtle'
                : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            {key === 'team' && <WorkerIcon className="size-4" aria-hidden />}
            {key === 'equipment' && <RollerIcon className="size-4" aria-hidden />}
            {t(`tab.${key}`)}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="grid items-start gap-stack xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardBody className="flex flex-col gap-3">
              <h2 className="font-semibold">{t('phases')}</h2>
              <Phases worksite={worksite} />
            </CardBody>
          </Card>
          <Card className="xl:col-span-2">
            <CardBody>
              <h2 className="mb-1 font-semibold">{t('todoTitle')}</h2>
              <NextSteps worksite={worksite} />
            </CardBody>
          </Card>
        </div>
      ) : (
        <Card>
          <CardBody>
            {tab === 'progress' && <ProgressEntry worksite={worksite} />}
            {tab === 'tasks' && <TaskTeam worksite={worksite} />}
            {tab === 'team' && <Team worksiteId={worksite.id} />}
            {tab === 'equipment' && <Equipment worksiteId={worksite.id} />}
          </CardBody>
        </Card>
      )}

      {canRecord && (
        <div className="sticky bottom-0 -mx-gutter border-t border-border bg-surface-raised p-3 sm:hidden">
          {enterProgress}
        </div>
      )}
    </section>
  );
}
