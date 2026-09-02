'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { InvitationStatus, Permission } from '@chantia/shared';
import { Alert, Button, EmptyState, Field, Select, Skeleton } from '@/shared/ui';
import { CreateIcon } from '@/shared/lib/icons';
import { Can } from '@/features/auth';
import { useInvitations } from '../api/invitation.queries';
import { INVITATION_STATUS_ORDER } from '../model/invitation-display';
import { useInvitationFilters } from '../model/use-invitation-filters';
import { InvitationList } from './invitation-table';
import { InviteDialog } from './invite-dialog';

/**
 * The invitations screen.
 *
 * It owns the four states a remote list can be in — loading, failed, empty,
 * populated — plus a fifth the worksite list does not have: **empty because of a
 * filter**, which is a different sentence and a different way out. "Aucune
 * invitation" under an active search would read as "nobody was ever invited",
 * which is a lie the user can act on.
 *
 * The rows come from `InvitationList`, which picks a table or cards by width.
 * The route in `app/` only mounts this.
 */
export function InvitationListPage() {
  const t = useTranslations('invitations');
  const tStatus = useTranslations('invitationStatus');
  const filters = useInvitationFilters();
  const [inviting, setInviting] = useState(false);
  const { data, isPending, isError, error, isPlaceholderData } = useInvitations(filters.params);

  const statusOptions = [
    { value: 'all', label: t('allStatuses') },
    ...INVITATION_STATUS_ORDER.map((status) => ({ value: status, label: tStatus(status) })),
  ];

  return (
    <section className="flex flex-col gap-section">
      <header className="flex flex-wrap items-baseline justify-between gap-stack">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          {data && <span className="text-sm text-fg-muted">{data.total}</span>}
        </div>
        {/* Hidden for anyone who may read accounts but not manage them. The API
          * enforces the same rule; this only spares a pointless 403. */}
        <Can permission={Permission.USER_MANAGE}>
          <Button variant="primary" onClick={() => setInviting(true)}>
            <CreateIcon className="size-4 shrink-0" aria-hidden />
            {t('create')}
          </Button>
        </Can>
      </header>

      <InviteDialog open={inviting} onClose={() => setInviting(false)} />

      {/* Stacked on a phone, side by side from `sm`. The search takes the room
        * that is left, because a name is longer than a status. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:flex-1">
          <Field
            label={t('searchLabel')}
            type="search"
            value={filters.search}
            onChange={(event) => filters.setSearch(event.target.value)}
            placeholder={t('searchPlaceholder')}
          />
        </div>
        <Select
          label={t('statusLabel')}
          options={statusOptions}
          value={filters.status}
          onChange={(event) =>
            filters.setStatus(event.target.value as InvitationStatus | 'all')
          }
        />
        {filters.isFiltering && (
          <Button variant="ghost" onClick={filters.clear}>
            {t('clearFilters')}
          </Button>
        )}
      </div>

      {isPending && (
        <div className="flex flex-col gap-2" aria-busy>
          {/* Same heights as the rows they stand in for, so nothing jumps when
            * the data lands. */}
          <Skeleton className="h-10" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      )}

      {isError && (
        <Alert tone="danger">
          {t('loadError', {
            reason: error instanceof Error ? error.message : t('unknownError'),
          })}
        </Alert>
      )}

      {data && data.items.length === 0 && !filters.isFiltering && (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          // An empty state without a way out is a dead end — and here the way
          // out is the very action the screen exists for.
          action={
            <Can permission={Permission.USER_MANAGE}>
              <Button variant="primary" onClick={() => setInviting(true)}>
                {t('create')}
              </Button>
            </Can>
          }
        />
      )}

      {data && data.items.length === 0 && filters.isFiltering && (
        <EmptyState
          title={t('noResultTitle')}
          description={t('noResultDescription')}
          action={<Button onClick={filters.clear}>{t('clearFilters')}</Button>}
        />
      )}

      {data && data.items.length > 0 && (
        // Dimmed while a new filter is in flight: the rows on screen are the
        // previous answer, and pretending otherwise for 300ms is how somebody
        // reads a stale list as the result of what they just typed.
        <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <InvitationList invitations={data.items} />
        </div>
      )}
    </section>
  );
}
