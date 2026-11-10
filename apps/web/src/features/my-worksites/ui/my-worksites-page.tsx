'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { IMyWorksite, WorksiteHealth } from '@chantia/shared';
import { Alert, Badge, Card, CardBody, EmptyState, Field, Skeleton } from '@/shared/ui';
import { TimesheetIcon } from '@/shared/lib/icons';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { Locale } from '@/shared/i18n/config';
import { useMyWorksites } from '../api/my-worksites.queries';
import { currentPhaseIndex, HEALTH_TONE } from '../model/my-worksites';

type Filter = 'all' | WorksiteHealth;
const FILTERS: Filter[] = ['all', 'late', 'control', 'ok'];

export function PhaseStrip({ worksite }: { worksite: IMyWorksite }) {
  const current = currentPhaseIndex(worksite);
  return (
    <div className="flex gap-[3px]" aria-hidden>
      {worksite.phases.map((phase, index) => (
        <span
          key={`${phase.label}-${index}`}
          className={cn(
            'h-1.5 flex-1 rounded-full',
            phase.progress >= 100
              ? 'bg-primary'
              : index === current
                ? worksite.health === 'late'
                  ? 'bg-danger'
                  : 'bg-primary'
                : 'bg-surface-muted',
          )}
        />
      ))}
    </div>
  );
}

function WorksiteCard({ worksite }: { worksite: IMyWorksite }) {
  const t = useTranslations('myWorksites');
  const locale = useLocale() as Locale;
  const current = currentPhaseIndex(worksite);
  const next = worksite.nextSteps[0];
  return (
    <Link
      href={`/my-worksites/${worksite.id}`}
      aria-label={t('open', { name: worksite.name })}
      className="group block h-full rounded-surface"
    >
      <Card className="h-full transition-shadow group-hover:shadow-overlay">
        <CardBody className="flex h-full flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-fg-muted">{worksite.code}</span>
            <Badge tone={HEALTH_TONE[worksite.health]} dot>
              {t(`health.${worksite.health}`)}
            </Badge>
          </div>
          <div className="min-w-0">
            <p className="font-semibold group-hover:text-primary">{worksite.name}</p>
            <p className="text-sm text-fg-muted">{worksite.client ?? t('noClient')}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-semibold tabular-nums">{worksite.progress} %</span>
              <span className="text-end text-xs text-fg-muted">
                {worksite.phases.length === 0
                  ? t('noPlan')
                  : `${t('phaseOf', { index: current + 1, total: worksite.phases.length })} · ${worksite.phases[current]?.label}`}
              </span>
            </div>
            <PhaseStrip worksite={worksite} />
          </div>
          <p className="mt-auto flex items-center gap-2 border-t border-border pt-3 text-sm">
            <TimesheetIcon className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
            {next ? (
              <span className="min-w-0">
                <span className="font-medium">{formatDate(next.plannedStart, locale)}</span>
                <span className="text-fg-muted"> · {next.label}</span>
              </span>
            ) : (
              <span className="text-fg-muted">{t('nothingNext')}</span>
            )}
          </p>
        </CardBody>
      </Card>
    </Link>
  );
}

/** The worksites in progress the signed-in person works on, the ones at risk first. */
export function MyWorksitesPage() {
  const t = useTranslations('myWorksites');
  const { data, isPending, isError } = useMyWorksites();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const mine = data ?? [];
  const count = (health: WorksiteHealth) => mine.filter((w) => w.health === health).length;
  const needle = search.trim().toLowerCase();
  const shown = mine.filter(
    (w) =>
      (filter === 'all' || w.health === filter) &&
      `${w.name} ${w.code} ${w.client ?? ''}`.toLowerCase().includes(needle),
  );

  return (
    <section className="flex flex-col gap-section">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        {data && data.length > 0 && (
          <p className="text-sm text-fg-muted">
            {t('summary', { late: count('late'), control: count('control') })}
          </p>
        )}
      </header>

      {isPending && (
        <div className="grid gap-stack sm:grid-cols-2 xl:grid-cols-3" aria-busy>
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      )}
      {isError && <Alert tone="danger">{t('loadError')}</Alert>}

      {data && mine.length === 0 && (
        <EmptyState title={t('noneTitle')} description={t('noneDescription')} />
      )}

      {mine.length > 0 && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-60 flex-1">
              <Field
                label={t('search')}
                type="search"
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {FILTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    'h-8 shrink-0 rounded-control border px-3 text-sm font-medium transition-colors',
                    filter === key
                      ? 'border-primary bg-primary-subtle text-primary-on-subtle'
                      : 'border-border-strong bg-surface-raised text-fg-muted hover:text-fg',
                  )}
                >
                  {key === 'all' ? t('all') : t(`health.${key}`)} ·{' '}
                  {key === 'all' ? mine.length : count(key)}
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <EmptyState title={t('noMatch')} />
          ) : (
            <ul className="grid gap-stack sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((worksite) => (
                <li key={worksite.id}>
                  <WorksiteCard worksite={worksite} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
