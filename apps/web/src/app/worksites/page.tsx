'use client';

import { useQuery } from '@tanstack/react-query';
import { WorksiteStatus, type IWorksite } from '@chantia/shared';
import { fetchWorksites } from '@/lib/api';

const STATUS: Record<WorksiteStatus, { label: string; className: string }> = {
  [WorksiteStatus.UPCOMING]: { label: 'À venir', className: 'bg-slate-100 text-slate-700' },
  [WorksiteStatus.IN_PROGRESS]: { label: 'En cours', className: 'bg-blue-100 text-blue-700' },
  [WorksiteStatus.COMPLETED]: { label: 'Terminé', className: 'bg-green-100 text-green-700' },
  [WorksiteStatus.SUSPENDED]: { label: 'Suspendu', className: 'bg-amber-100 text-amber-700' },
};

function formatBudget(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function WorksitesPage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['worksites'],
    queryFn: fetchWorksites,
  });

  return (
    <section>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Chantiers</h1>
        {data && <span className="text-sm text-slate-500">{data.total} au total</span>}
      </div>

      {isPending && <p className="text-slate-500">Chargement…</p>}

      {isError && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Erreur : {error instanceof Error ? error.message : 'inconnue'}
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="rounded-md border border-dashed border-black/15 px-4 py-10 text-center text-slate-500 dark:border-white/15">
          Aucun chantier pour l’instant.
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/5 text-xs uppercase tracking-wide text-slate-500 dark:bg-white/5">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Budget</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((w: IWorksite) => (
                <tr key={w.id} className="border-t border-black/5 dark:border-white/5">
                  <td className="px-4 py-3 font-mono text-xs">{w.code}</td>
                  <td className="px-4 py-3 font-medium">{w.name}</td>
                  <td className="px-4 py-3 text-slate-500">{w.client ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[w.status].className}`}
                    >
                      {STATUS[w.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBudget(w.totalBudget)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
