'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { IWorker } from '@chantia/shared';
import { Badge, Card, CardBody, TD, TH, THead, TRow, Table } from '@/shared/ui';
import { formatAmount } from '@/shared/lib/format';
import type { Locale } from '@/shared/i18n/config';
import { workerStatusTone } from '../model/worker-display';
import { WorkerActions } from './worker-actions';

/**
 * The rows, in two shapes — same split as `InvitationList`, and the same
 * reason: a table on a 390px screen either scrolls the actions off-screen or
 * squeezes every cell to two words.
 */
export function WorkerList({
  workers,
  onEdit,
}: {
  workers: IWorker[];
  onEdit: (worker: IWorker) => void;
}) {
  return (
    <>
      <div className="md:hidden">
        <WorkerCards workers={workers} onEdit={onEdit} />
      </div>
      <div className="hidden md:block">
        <WorkerTable workers={workers} onEdit={onEdit} />
      </div>
    </>
  );
}

function WorkerTable({
  workers,
  onEdit,
}: {
  workers: IWorker[];
  onEdit: (worker: IWorker) => void;
}) {
  const t = useTranslations('workers');
  const locale = useLocale() as Locale;

  return (
    <Table>
      <THead>
        <tr>
          <TH>{t('name')}</TH>
          <TH>{t('qualification')}</TH>
          <TH numeric>{t('hourlyRate')}</TH>
          <TH>{t('status')}</TH>
          {/* The header of an actions column says nothing useful out loud, and
            * an empty `<th>` is announced as "blank". */}
          <TH>
            <span className="sr-only">{t('actions')}</span>
          </TH>
        </tr>
      </THead>
      <tbody>
        {workers.map((worker) => (
          <TRow key={worker.id}>
            <TD className="font-medium">{worker.name}</TD>
            <TD className="text-fg-muted">{worker.qualification ?? '—'}</TD>
            <TD numeric>{formatAmount(worker.hourlyRate, locale, 2)}</TD>
            <TD>
              <Badge tone={workerStatusTone(worker.active)} dot>
                {t(worker.active ? 'active' : 'inactive')}
              </Badge>
            </TD>
            <TD>
              <WorkerActions worker={worker} onEdit={() => onEdit(worker)} />
            </TD>
          </TRow>
        ))}
      </tbody>
    </Table>
  );
}

function WorkerCards({
  workers,
  onEdit,
}: {
  workers: IWorker[];
  onEdit: (worker: IWorker) => void;
}) {
  const t = useTranslations('workers');
  const locale = useLocale() as Locale;

  return (
    <ul className="flex flex-col gap-2">
      {workers.map((worker) => (
        <li key={worker.id}>
          <Card>
            <CardBody className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{worker.name}</p>
                  <p className="truncate text-sm text-fg-muted">
                    {worker.qualification ?? t('noQualification')}
                  </p>
                </div>
                <Badge tone={workerStatusTone(worker.active)} dot>
                  {t(worker.active ? 'active' : 'inactive')}
                </Badge>
              </div>

              <p className="text-xs text-fg-muted">
                {t('hourlyRateValue', { amount: formatAmount(worker.hourlyRate, locale, 2) })}
              </p>

              <WorkerActions worker={worker} onEdit={() => onEdit(worker)} compact />
            </CardBody>
          </Card>
        </li>
      ))}
    </ul>
  );
}
