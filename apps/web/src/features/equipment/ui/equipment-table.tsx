'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Permission, type IEquipment } from '@chantia/shared';
import { Badge, Button, Card, CardBody, TD, TH, THead, TRow, Table } from '@/shared/ui';
import { CalendarIcon } from '@/shared/lib/icons';
import { formatAmount, formatDate } from '@/shared/lib/format';
import type { Locale } from '@/shared/i18n/config';
import { useEveryPermission, usePermission } from '@/features/auth';
import { useEquipmentCatalog } from '../api/equipment.queries';
import { EQUIPMENT_STATUS_TONE, findType, labelOf } from '../model/equipment-display';
import { EquipmentActions } from './equipment-actions';

interface RowsProps {
  equipment: IEquipment[];
  onEdit: (equipment: IEquipment) => void;
  /** Opens the machine's planning — readable by anyone who sees the fleet. */
  onPlan?: (equipment: IEquipment) => void;
}

/** The type's label from the catalog; its code until the catalog arrives. */
function useTypeLabel(): (code: string) => string {
  const catalog = useEquipmentCatalog();
  const locale = useLocale();
  return (code) => {
    const type = findType(catalog.data, code);
    return type ? labelOf(type, locale) : code;
  };
}

function PlanButton({
  machine,
  onPlan,
  compact = false,
}: {
  machine: IEquipment;
  onPlan: (equipment: IEquipment) => void;
  compact?: boolean;
}) {
  const t = useTranslations('equipment');
  return (
    <Button
      variant="ghost"
      size={compact ? 'sm' : 'icon'}
      onClick={() => onPlan(machine)}
      title={t('planning')}
      aria-label={compact ? undefined : t('planningFor', { name: machine.designation })}
    >
      <CalendarIcon className="size-4 shrink-0" aria-hidden />
      {compact && <span>{t('planning')}</span>}
    </Button>
  );
}

/**
 * The fleet, as a table from `md` and cards below.
 *
 * Two permissions shape what appears. `budget:read` — today's cost per day and
 * the end of depreciation, a whole column, like a worksite's budget; the API
 * does not send the figures either. `equipment:manage` with `budget:manage` —
 * the actions, the same pair the API asks for, since a machine is written with
 * its price. The planning opens for anyone who sees the fleet: a foreman
 * needs to know where a machine is, not what it costs.
 */
export function EquipmentList(props: RowsProps) {
  return (
    <>
      <div className="md:hidden">
        <EquipmentCards {...props} />
      </div>
      <div className="hidden md:block">
        <EquipmentTable {...props} />
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

function EquipmentTable({ equipment, onEdit, onPlan }: RowsProps) {
  const t = useTranslations('equipment');
  const tType = useTypeLabel();
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
          <TH>
            <span className="sr-only">{t('actions')}</span>
          </TH>
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
            <TD>
              <div className="flex items-start justify-end gap-1">
                {onPlan && <PlanButton machine={machine} onPlan={onPlan} />}
                {canManage && (
                  <EquipmentActions equipment={machine} onEdit={() => onEdit(machine)} />
                )}
              </div>
            </TD>
          </TRow>
        ))}
      </tbody>
    </Table>
  );
}

function EquipmentCards({ equipment, onEdit, onPlan }: RowsProps) {
  const t = useTranslations('equipment');
  const tType = useTypeLabel();
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

              <div className="flex flex-wrap items-start justify-end gap-1">
                {onPlan && <PlanButton machine={machine} onPlan={onPlan} compact />}
                {canManage && (
                  <EquipmentActions equipment={machine} onEdit={() => onEdit(machine)} compact />
                )}
              </div>
            </CardBody>
          </Card>
        </li>
      ))}
    </ul>
  );
}
