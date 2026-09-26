'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Permission, type IEquipment } from '@chantia/shared';
import { Badge, Card, CardBody, TD, TH, THead, TRow, Table } from '@/shared/ui';
import { formatAmount, formatDate } from '@/shared/lib/format';
import type { Locale } from '@/shared/i18n/config';
import { useEveryPermission, usePermission } from '@/features/auth';
import { EQUIPMENT_STATUS_TONE } from '../model/equipment-display';
import { EquipmentActions } from './equipment-actions';

interface RowsProps {
  equipment: IEquipment[];
  onEdit: (equipment: IEquipment) => void;
}

/**
 * The fleet, as a table from `md` and cards below.
 *
 * Two permissions shape what appears. `budget:read` — today's cost per day and
 * the end of depreciation, a whole column, like a worksite's budget; the API
 * does not send the figures either. `equipment:manage` with `budget:manage` —
 * the actions, the same pair the API asks for, since a machine is written with
 * its price.
 */
export function EquipmentList({ equipment, onEdit }: RowsProps) {
  return (
    <>
      <div className="md:hidden">
        <EquipmentCards equipment={equipment} onEdit={onEdit} />
      </div>
      <div className="hidden md:block">
        <EquipmentTable equipment={equipment} onEdit={onEdit} />
      </div>
    </>
  );
}

function useRowPermissions() {
  return {
    showsMoney: usePermission(Permission.BUDGET_READ),
    canManage: useEveryPermission([Permission.EQUIPMENT_MANAGE, Permission.BUDGET_MANAGE]),
  };
}

function EquipmentTable({ equipment, onEdit }: RowsProps) {
  const t = useTranslations('equipment');
  const tType = useTranslations('equipmentType');
  const tStatus = useTranslations('equipmentStatus');
  const tMethod = useTranslations('acquisitionMethod');
  const locale = useLocale() as Locale;
  const { showsMoney, canManage } = useRowPermissions();

  return (
    <Table>
      <THead>
        <tr>
          <TH>{t('fleetNumber')}</TH>
          <TH>{t('designation')}</TH>
          <TH>{t('type')}</TH>
          <TH>{t('acquisitionMethod')}</TH>
          <TH>{t('status')}</TH>
          {showsMoney && <TH numeric>{t('dailyCost')}</TH>}
          {showsMoney && <TH>{t('depreciationEnd')}</TH>}
          {canManage && (
            <TH>
              <span className="sr-only">{t('actions')}</span>
            </TH>
          )}
        </tr>
      </THead>
      <tbody>
        {equipment.map((machine) => (
          <TRow key={machine.id}>
            <TD className="font-mono text-xs text-fg-muted">{machine.fleetNumber ?? '—'}</TD>
            <TD className="font-medium">{machine.designation}</TD>
            <TD className="text-fg-muted">{tType(machine.typeCode)}</TD>
            <TD className="text-fg-muted">{tMethod(machine.acquisitionMethod)}</TD>
            <TD>
              <Badge tone={EQUIPMENT_STATUS_TONE[machine.status]} dot>
                {tStatus(machine.status)}
              </Badge>
            </TD>
            {showsMoney && <TD numeric>{formatAmount(machine.dailyCost, locale, 2)}</TD>}
            {showsMoney && (
              <TD className="text-fg-muted">{formatDate(machine.depreciationEndDate, locale)}</TD>
            )}
            {canManage && (
              <TD>
                <EquipmentActions equipment={machine} onEdit={() => onEdit(machine)} />
              </TD>
            )}
          </TRow>
        ))}
      </tbody>
    </Table>
  );
}

function EquipmentCards({ equipment, onEdit }: RowsProps) {
  const t = useTranslations('equipment');
  const tType = useTranslations('equipmentType');
  const tStatus = useTranslations('equipmentStatus');
  const locale = useLocale() as Locale;
  const { showsMoney, canManage } = useRowPermissions();

  return (
    <ul className="flex flex-col gap-2">
      {equipment.map((machine) => (
        <li key={machine.id}>
          <Card>
            <CardBody className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{machine.designation}</p>
                  <p className="truncate text-sm text-fg-muted">
                    {machine.fleetNumber && (
                      <span className="font-mono text-xs">{machine.fleetNumber} · </span>
                    )}
                    {tType(machine.typeCode)}
                  </p>
                </div>
                <Badge tone={EQUIPMENT_STATUS_TONE[machine.status]} dot>
                  {tStatus(machine.status)}
                </Badge>
              </div>

              {showsMoney && (
                <p className="text-xs text-fg-muted">
                  {t('dailyCostValue', { amount: formatAmount(machine.dailyCost, locale, 2) })}
                </p>
              )}

              {canManage && (
                <EquipmentActions equipment={machine} onEdit={() => onEdit(machine)} compact />
              )}
            </CardBody>
          </Card>
        </li>
      ))}
    </ul>
  );
}
