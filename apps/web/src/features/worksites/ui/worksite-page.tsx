'use client';

import { useState, type ComponentType } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Permission } from '@chantia/shared';
import { ApiError } from '@/shared/api/http-client';
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
} from '@/shared/ui';
import { BackIcon, EditIcon } from '@/shared/lib/icons';
import { formatAmount, formatDate } from '@/shared/lib/format';
import type { Locale } from '@/shared/i18n/config';
import { Can, usePermission } from '@/features/auth';
import { useWorksite } from '../api/worksite.queries';
import { WORKSITE_STATUS_TONE } from '../model/worksite-display';
import { scheduleProgress } from '../model/schedule-progress';
import { ScheduleBar } from './schedule-bar';
import { WorksiteCosts } from './worksite-costs';
import { WorksiteDrawer, type ClientPicker } from './worksite-drawer';

/**
 * What the worksite page shows that belongs to other features — handed in by
 * the route, which is where features meet (they do not import each other).
 * Declared here, by the consumer; each feature satisfies it structurally.
 */
export interface WorksitePanels {
  /** The machines booked on this worksite. */
  Equipment?: ComponentType<{ worksiteId: string }>;
  /** The people to call at its client. */
  ClientContacts?: ComponentType<{ clientId: string }>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * One worksite's management page — reached from the home page's cards and
 * from the worksite list.
 *
 * Its own facts (schedule, address, client), its costs for whoever reads
 * budgets, and what other features know about it: the machines on it, the
 * client's contacts. Editing opens the same drawer as the list, so there is
 * one form for a worksite, not two.
 */
export function WorksitePage({
  id,
  ClientPicker,
  Equipment,
  ClientContacts,
}: { id: string; ClientPicker?: ClientPicker } & WorksitePanels) {
  const t = useTranslations('worksitePage');
  const tWorksites = useTranslations('worksites');
  const tStatus = useTranslations('worksiteStatus');
  const locale = useLocale() as Locale;
  const readsMoney = usePermission(Permission.BUDGET_READ);
  const { data: worksite, isPending, isError, error } = useWorksite(id);
  const [editing, setEditing] = useState(false);

  if (isPending) {
    return (
      <div className="flex flex-col gap-section" aria-busy>
        <Skeleton className="h-16" />
        <div className="grid gap-stack lg:grid-cols-3">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (isError || !worksite) {
    // Another organization's worksite answers 404 too — the same page, on
    // purpose: telling the two apart would confirm the other one exists.
    const notFound = error instanceof ApiError && error.status === 404;
    return notFound ? (
      <EmptyState
        title={t('notFoundTitle')}
        description={t('notFoundDescription')}
        action={<ButtonLink href="/worksites">{t('backToList')}</ButtonLink>}
      />
    ) : (
      <Alert tone="danger">
        {t('loadError', { reason: error instanceof Error ? error.message : t('unknownError') })}
      </Alert>
    );
  }

  return (
    <section className="flex flex-col gap-section">
      <div>
        <ButtonLink href="/" variant="ghost" size="sm" className="-ms-3">
          <BackIcon className="size-4 shrink-0 rtl:rotate-180" aria-hidden />
          {t('backHome')}
        </ButtonLink>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-stack">
        <div className="min-w-0">
          <p className="font-mono text-sm text-fg-muted">{worksite.code}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{worksite.name}</h1>
            <Badge tone={WORKSITE_STATUS_TONE[worksite.status]} dot>
              {tStatus(worksite.status)}
            </Badge>
          </div>
          <p className="text-fg-muted">{worksite.client?.displayName ?? tWorksites('noClient')}</p>
        </div>
        <Can permission={Permission.WORKSITE_MANAGE}>
          <Button onClick={() => setEditing(true)}>
            <EditIcon className="size-4 shrink-0" aria-hidden />
            {t('edit')}
          </Button>
        </Can>
      </header>

      {/* Remounted per open, so the form starts from the worksite as it is now. */}
      {editing && (
        <WorksiteDrawer
          open
          worksite={worksite}
          onClose={() => setEditing(false)}
          ClientPicker={ClientPicker}
        />
      )}

      <div className="grid items-start gap-stack lg:grid-cols-3">
        <div className="flex flex-col gap-stack lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('schedule')}</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
              <ScheduleBar
                progress={scheduleProgress(
                  worksite.plannedStartDate,
                  worksite.plannedEndDate,
                  today(),
                )}
              />
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-fg-muted">{t('plannedStart')}</dt>
                  <dd>{formatDate(worksite.plannedStartDate, locale)}</dd>
                </div>
                <div>
                  <dt className="text-fg-muted">{t('plannedEnd')}</dt>
                  <dd>{formatDate(worksite.plannedEndDate, locale)}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          {Equipment && (
            <Card>
              <CardHeader>
                <CardTitle>{t('equipment')}</CardTitle>
              </CardHeader>
              <CardBody>
                <Equipment worksiteId={worksite.id} />
              </CardBody>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-stack">
          <Card>
            <CardHeader>
              <CardTitle>{t('details')}</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="flex flex-col gap-2 text-sm">
                <div>
                  <dt className="text-fg-muted">{tWorksites('client')}</dt>
                  <dd>{worksite.client?.displayName ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-fg-muted">{tWorksites('address')}</dt>
                  <dd>{worksite.address ?? '—'}</dd>
                </div>
                {readsMoney && worksite.totalBudget !== undefined && (
                  <div>
                    <dt className="text-fg-muted">{tWorksites('budget')}</dt>
                    <dd className="tabular-nums">{formatAmount(worksite.totalBudget, locale)}</dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          {ClientContacts && worksite.clientId && (
            <Card>
              <CardHeader>
                <CardTitle>{t('contacts')}</CardTitle>
              </CardHeader>
              <CardBody>
                <ClientContacts clientId={worksite.clientId} />
              </CardBody>
            </Card>
          )}

          {readsMoney && (
            <Card>
              <CardHeader>
                <CardTitle>{tWorksites('costs')}</CardTitle>
              </CardHeader>
              <CardBody>
                <WorksiteCosts worksiteId={worksite.id} />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
