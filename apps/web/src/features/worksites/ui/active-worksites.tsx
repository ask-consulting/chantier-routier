'use client';

import { useTranslations } from 'next-intl';
import { Permission, WorksiteStatus } from '@chantia/shared';
import { Alert, ButtonLink, EmptyState, Skeleton } from '@/shared/ui';
import { Can } from '@/features/auth';
import { useWorksites } from '../api/worksite.queries';
import { WorksiteCard } from './worksite-card';

/**
 * The home page: the worksites in progress, as cards — what somebody opening
 * the application most likely came for. Each opens that worksite's page.
 *
 * All of them in one request (`paginated: false`): a company runs a few dozen
 * worksites at once, not thousands, and a paginated wall of cards would hide
 * the ones on page two.
 */
export function ActiveWorksites() {
  const t = useTranslations('home');
  const { data, isPending, isError, error } = useWorksites({
    status: WorksiteStatus.IN_PROGRESS,
    paginated: false,
  });

  return (
    <section className="flex flex-col gap-section">
      <header className="flex flex-wrap items-baseline justify-between gap-stack">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          {data && <span className="text-sm text-fg-muted">{data.total}</span>}
        </div>
        <ButtonLink href="/worksites" variant="ghost">
          {t('allWorksites')}
        </ButtonLink>
      </header>

      {isPending && (
        <div className="grid gap-stack sm:grid-cols-2 xl:grid-cols-3" aria-busy>
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}

      {isError && (
        <Alert tone="danger">
          {t('loadError', { reason: error instanceof Error ? error.message : t('unknownError') })}
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={
            <Can permission={Permission.WORKSITE_MANAGE}>
              <ButtonLink href="/worksites" variant="primary">
                {t('goToWorksites')}
              </ButtonLink>
            </Can>
          }
        />
      )}

      {data && data.items.length > 0 && (
        <ul className="grid gap-stack sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((worksite) => (
            <li key={worksite.id}>
              <WorksiteCard worksite={worksite} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
