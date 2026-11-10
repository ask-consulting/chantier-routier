'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Alert, Badge, Button, ButtonLink, Card, CardBody, EmptyState } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import {
  BackIcon,
  ChecklistIcon,
  NoteIcon,
  PurchaseIcon,
  RollerIcon,
  WorkerIcon,
} from '@/shared/lib/icons';
import { useSession } from '@/features/auth';
import {
  currentPhaseIndex,
  HEALTH_TONE,
  isVisibleTo,
  loadMyWorksites,
  phaseProgress,
  taskProgress,
  TODO_TONE,
  withSubtaskProgress,
  worksiteProgress,
  type ListLine,
  type MyWorksite,
} from '../model/my-worksites';

const TABS = [
  'overview',
  'planning',
  'progress',
  'team',
  'equipment',
  'purchases',
  'notes',
] as const;
type Tab = (typeof TABS)[number];

const round = (value: number): string => `${Math.round(value)} %`;

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
        <p className="text-xs text-fg-muted">{sub}</p>
      </CardBody>
    </Card>
  );
}

function PlanningChart({ worksite }: { worksite: MyWorksite }) {
  const current = currentPhaseIndex(worksite);
  return (
    <div className="flex flex-col gap-1.5" dir="ltr">
      {worksite.phases.map((phase, index) => (
        <div
          key={phase.label}
          className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-2.5 sm:grid-cols-[12rem_minmax(0,1fr)]"
        >
          <span dir="auto" title={phase.label} className="truncate text-sm">
            {phase.label}
          </span>
          <div className="relative h-[22px] rounded bg-surface-muted">
            <span
              className={cn(
                'absolute inset-y-[5px] rounded-sm',
                phaseProgress(phase) >= 100 && 'bg-primary',
                phaseProgress(phase) < 100 && index !== current && 'bg-fg-subtle',
                phaseProgress(phase) < 100 &&
                  index === current &&
                  (worksite.status === 'late' ? 'bg-danger' : 'bg-primary'),
              )}
              style={{ left: `${phase.startPercent}%`, width: `${phase.durationPercent}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Lines({ lines, empty }: { lines: ListLine[]; empty: string }) {
  if (lines.length === 0) {
    return <p className="text-sm text-fg-muted">{empty}</p>;
  }
  return (
    <ul>
      {lines.map((line) => (
        <li
          key={line.title}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border py-3 first:border-t-0"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{line.title}</p>
            <p className="text-sm text-fg-muted">{line.detail}</p>
          </div>
          <p className="text-xs text-fg-muted">{line.meta}</p>
        </li>
      ))}
    </ul>
  );
}

function ProgressEntry({
  worksite,
  onChange,
}: {
  worksite: MyWorksite;
  onChange: (subtaskId: string, progress: number) => void;
}) {
  const t = useTranslations('myWorksites');
  const phase = worksite.phases[currentPhaseIndex(worksite)];
  return (
    <div className="flex flex-col gap-section">
      <p className="text-sm text-fg-muted">{t('progressHint')}</p>
      {phase?.tasks.map((task) => (
        <div key={task.label} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-semibold">{task.label}</h3>
            <span className="text-lg font-semibold tabular-nums">{round(taskProgress(task))}</span>
          </div>
          {task.subtasks.map((subtask) => (
            <div key={subtask.id} className="flex flex-col gap-1 border-t border-border pt-3">
              <div className="flex justify-between gap-3 text-sm">
                <label htmlFor={subtask.id} className="font-medium">
                  {subtask.label}
                </label>
                <span className="tabular-nums">{subtask.progress} %</span>
              </div>
              <input
                id={subtask.id}
                type="range"
                min={0}
                max={100}
                step={5}
                value={subtask.progress}
                onChange={(event) => onChange(subtask.id, Number(event.target.value))}
                className="h-6 w-full accent-primary"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** One worksite: where it stands, what to do now, and its sections. */
export function MyWorksitePage({ id }: { id: string }) {
  const t = useTranslations('myWorksites');
  const { user } = useSession();
  const found = loadMyWorksites().find(
    (candidate) => candidate.id === id && user && isVisibleTo(candidate, user),
  );
  const [worksite, setWorksite] = useState(found);
  const [tab, setTab] = useState<Tab>('overview');

  if (!worksite) {
    return (
      <EmptyState
        title={t('notFoundTitle')}
        description={t('notFoundDescription')}
        action={<ButtonLink href="/my-worksites">{t('back')}</ButtonLink>}
      />
    );
  }

  const shortcuts = [
    { key: 'notes', Icon: NoteIcon },
    { key: 'team', Icon: WorkerIcon },
    { key: 'equipment', Icon: RollerIcon },
    { key: 'purchases', Icon: PurchaseIcon },
  ] as const;
  const seizeProgress = (
    <Button variant="primary" className="w-full sm:w-auto" onClick={() => setTab('progress')}>
      <ChecklistIcon className="size-4 shrink-0" aria-hidden />
      {t('enterProgress')}
    </Button>
  );

  return (
    <section className="flex flex-col gap-5">
      <div>
        <ButtonLink href="/my-worksites" variant="ghost" size="sm" className="-ms-3">
          <BackIcon className="size-4 shrink-0 rtl:rotate-180" aria-hidden />
          {t('back')}
        </ButtonLink>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-fg-muted">{worksite.code}</span>
            <Badge tone={HEALTH_TONE[worksite.status]} dot>
              {t(`health.${worksite.status}`)}
            </Badge>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{worksite.name}</h1>
          <p className="text-fg-muted">{worksite.client}</p>
        </div>
        <div className="hidden sm:block">{seizeProgress}</div>
      </header>

      <Alert tone="info">{t('exampleData')}</Alert>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label={t('statProgress')}
          value={round(worksiteProgress(worksite))}
          sub={t('statPlanned', { percent: worksite.plannedProgress })}
        />
        <Stat
          label={t('statDelay')}
          value={
            worksite.delayDays === null ? t('noDelay') : t('days', { count: worksite.delayDays })
          }
          sub={worksite.phases[currentPhaseIndex(worksite)]?.label}
          danger={worksite.delayDays !== null}
        />
        <Stat
          label={t('statBudget')}
          value={`${worksite.spendPercent} %`}
          sub={t('statBudgetSub')}
        />
        <Stat
          label={t('statSite')}
          value={worksite.teamCount}
          sub={t('statSiteSub', { gear: worksite.gearCount })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {shortcuts.map(({ key, Icon }) => (
          <Button key={key} onClick={() => setTab(key)}>
            <Icon className="size-4 shrink-0" aria-hidden />
            {t(`shortcut.${key}`)}
          </Button>
        ))}
      </div>

      <div
        role="tablist"
        aria-label={t('sections')}
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'h-11 shrink-0 border-b-2 px-3 text-sm font-medium',
              tab === key
                ? 'border-primary text-primary-on-subtle'
                : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            {t(`tab.${key}`)}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="grid items-start gap-stack xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{t('tab.planning')}</h2>
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => setTab('planning')}
                >
                  {t('seeAll')}
                </button>
              </div>
              <PlanningChart worksite={worksite} />
            </CardBody>
          </Card>
          <Card className="xl:col-span-2">
            <CardBody>
              <h2 className="mb-1 font-semibold">{t('todoTitle')}</h2>
              {worksite.todo.length === 0 ? (
                <p className="text-sm text-fg-muted">{t('todoEmpty')}</p>
              ) : (
                <ul>
                  {worksite.todo.map((line) => (
                    <li
                      key={line.label}
                      className="flex items-center justify-between gap-3 border-t border-border py-3 first:border-t-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{line.label}</p>
                        <p className="text-sm text-fg-muted">{line.detail}</p>
                      </div>
                      <Badge tone={TODO_TONE[line.kind]}>{t(`todoKind.${line.kind}`)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      ) : (
        <Card>
          <CardBody>
            {tab === 'planning' && <PlanningChart worksite={worksite} />}
            {tab === 'progress' && (
              <ProgressEntry
                worksite={worksite}
                onChange={(subtaskId, progress) =>
                  setWorksite(withSubtaskProgress(worksite, subtaskId, progress))
                }
              />
            )}
            {tab === 'team' && <Lines lines={worksite.team} empty={t('listEmpty')} />}
            {tab === 'equipment' && <Lines lines={worksite.equipment} empty={t('listEmpty')} />}
            {tab === 'purchases' && <Lines lines={worksite.purchases} empty={t('listEmpty')} />}
            {tab === 'notes' && <Lines lines={worksite.notes} empty={t('listEmpty')} />}
          </CardBody>
        </Card>
      )}

      <div className="sticky bottom-0 -mx-gutter border-t border-border bg-surface-raised p-3 sm:hidden">
        {seizeProgress}
      </div>
    </section>
  );
}
