'use client';

import { useQuery } from '@tanstack/react-query';
import type { IWorksite } from '@chantia/shared';
import { fetchWorksites } from '@/lib/api';
import { Alert, Badge, Button, EmptyState, Skeleton, TD, TH, THead, TRow, Table } from '@/components/ui';
import { WORKSITE_STATUS, formatAmount } from '@/lib/domain-display';

export default function WorksitesPage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['worksites'],
    queryFn: fetchWorksites,
  });

  return (
    <section className="flex flex-col gap-section">
      <header className="flex items-baseline justify-between gap-stack">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Chantiers</h1>
          {data && <span className="text-sm text-fg-muted">{data.total} au total</span>}
        </div>
        <Button variant="primary">Nouveau chantier</Button>
      </header>

      {isPending && (
        <div className="flex flex-col gap-2" aria-busy>
          {/* Same height as the rows it replaces, so the table does not jump. */}
          <Skeleton className="h-10" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      )}

      {isError && (
        <Alert tone="danger">
          Impossible de charger les chantiers : {error instanceof Error ? error.message : 'erreur inconnue'}
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          title="Aucun chantier pour l’instant"
          description="Créez votre premier chantier pour suivre son budget et ses pointages."
          action={<Button variant="primary">Nouveau chantier</Button>}
        />
      )}

      {data && data.items.length > 0 && (
        <Table>
          <THead>
            <tr>
              <TH>Code</TH>
              <TH>Nom</TH>
              <TH>Client</TH>
              <TH>Statut</TH>
              <TH numeric>Budget</TH>
            </tr>
          </THead>
          <tbody>
            {data.items.map((worksite: IWorksite) => {
              const status = WORKSITE_STATUS[worksite.status];
              return (
                <TRow key={worksite.id}>
                  <TD className="font-mono text-xs text-fg-muted">{worksite.code}</TD>
                  <TD className="font-medium">{worksite.name}</TD>
                  <TD className="text-fg-muted">{worksite.client ?? '—'}</TD>
                  <TD>
                    <Badge tone={status.tone} dot>
                      {status.label}
                    </Badge>
                  </TD>
                  <TD numeric>{formatAmount(worksite.totalBudget)}</TD>
                </TRow>
              );
            })}
          </tbody>
        </Table>
      )}
    </section>
  );
}
