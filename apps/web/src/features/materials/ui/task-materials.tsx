'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Permission,
  plannedMaterialCost,
  PlanNodeLevel,
  type ITaskMaterial,
  type IWorksiteTask,
} from '@chantia/shared';
import { ApiError } from '@/shared/api/http-client';
import {
  Alert,
  Button,
  ButtonLink,
  Dialog,
  EmptyState,
  Field,
  Select,
  Skeleton,
} from '@/shared/ui';
import { CloseIcon, MaterialIcon } from '@/shared/lib/icons';
import { formatAmount } from '@/shared/lib/format';
import { fromStoredAmount, toStoredAmount } from '@/shared/lib/currency';
import { intlLocale, type Locale } from '@/shared/i18n/config';
import { usePermission } from '@/features/auth';
import {
  useMaterialCatalog,
  useOwnMaterials,
  useTaskMaterialChanges,
  useTaskMaterials,
  useWorksitePlan,
} from '../api/materials.queries';
import { choicesOf, labelOf, needLabel, parseQuantity } from '../model/materials';

/** The message for a refusal of the API. */
function errorKey(error: unknown): string {
  const code = error instanceof ApiError ? error.fields?.[0]?.code : undefined;
  return code === 'form.errors.alreadyOnTask' ? 'materialErrors.already' : 'saveError';
}

/** A price as typed: empty is none, anything else must be a positive amount. */
function parsePrice(typed: string): { ok: boolean; value: number | null } {
  if (typed.trim() === '') {
    return { ok: true, value: null };
  }
  const value = Number(typed.trim().replace(',', '.'));
  return Number.isFinite(value) && value >= 0
    ? { ok: true, value: toStoredAmount(value) }
    : { ok: false, value: null };
}

function formatQuantity(quantity: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 3 }).format(quantity);
}

/** Plans a material on a task, or changes the quantity and price of one already there. */
function NeedDialog({
  worksiteId,
  task,
  need,
  onClose,
}: {
  worksiteId: string;
  task: IWorksiteTask;
  /** `null` to plan a new one. */
  need: ITaskMaterial | null;
  onClose: () => void;
}) {
  const t = useTranslations('myWorksites');
  const tMaterials = useTranslations('materials');
  const locale = useLocale() as Locale;
  const seesMoney = usePermission(Permission.BUDGET_READ);
  const catalog = useMaterialCatalog();
  const own = useOwnMaterials();
  const changes = useTaskMaterialChanges(worksiteId);
  const [categoryId, setCategoryId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState(need ? String(need.quantity) : '');
  const [price, setPrice] = useState(
    need?.unitPrice == null ? '' : String(fromStoredAmount(need.unitPrice)),
  );

  const categories = catalog.data ?? [];
  const choices = choicesOf(categories, own.data ?? [], categoryId, locale);
  const choice = choices.find((candidate) => candidate.id === materialId);
  const unit = need?.unit ?? choice?.unit;
  const typedQuantity = parseQuantity(quantity);
  const typedPrice = parsePrice(price);
  const cost =
    typedQuantity === null ? null : plannedMaterialCost(typedQuantity, typedPrice.value);
  const mutation = need ? changes.update : changes.plan;
  const valid = typedQuantity !== null && typedPrice.ok && (need !== null || materialId !== '');

  const save = () => {
    if (typedQuantity === null) {
      return;
    }
    const money = seesMoney ? { unitPrice: typedPrice.value } : {};
    if (need) {
      changes.update.mutate(
        { id: need.id, data: { quantity: typedQuantity, ...money } },
        { onSuccess: onClose },
      );
    } else {
      changes.plan.mutate(
        { taskId: task.id, data: { materialId, quantity: typedQuantity, ...money } },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <Dialog
      open
      title={t('materialTitle', { label: task.label })}
      closeLabel={t('close')}
      onClose={onClose}
      busy={mutation.isPending}
    >
      <div className="flex flex-col gap-4">
        {need ? (
          <p className="flex items-center gap-2 font-semibold">
            <MaterialIcon className="size-4" aria-hidden />
            {needLabel(need, locale)}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {catalog.isPending && <Skeleton className="h-10 w-full" />}
            <Select
              label={tMaterials('category')}
              options={[
                { value: '', label: t('chooseCategory') },
                ...categories.map((category) => ({
                  value: category.id,
                  label: labelOf(category, locale),
                })),
              ]}
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setMaterialId('');
              }}
            />
            <Select
              label={t('material')}
              disabled={categoryId === ''}
              options={[
                { value: '', label: t('chooseMaterial') },
                ...choices.map((candidate) => ({
                  value: candidate.id,
                  label: candidate.own
                    ? `${candidate.label} · ${tMaterials('own')}`
                    : candidate.label,
                })),
              ]}
              value={materialId}
              onChange={(event) => setMaterialId(event.target.value)}
            />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={
              unit
                ? t('quantityIn', { unit: tMaterials(`units.${unit}`) })
                : t('quantity')
            }
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          {seesMoney && (
            <Field
              label={t('unitPrice')}
              inputMode="decimal"
              hint={t('unitPriceHint')}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          )}
        </div>
        {seesMoney && cost !== null && (
          <p className="text-sm text-fg-muted">
            {t('plannedCost', { amount: formatAmount(cost, locale, 3) })}
          </p>
        )}
        {mutation.isError && <Alert tone="danger">{t(errorKey(mutation.error))}</Alert>}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" disabled={!valid || mutation.isPending} onClick={save}>
            {need ? t('save') : t('planMaterial')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function TaskRow({
  worksiteId,
  task,
  depth,
  needs,
  onPlan,
  onEdit,
}: {
  worksiteId: string;
  task: IWorksiteTask;
  depth: number;
  needs: readonly ITaskMaterial[];
  onPlan: (task: IWorksiteTask) => void;
  onEdit: (task: IWorksiteTask, need: ITaskMaterial) => void;
}) {
  const t = useTranslations('myWorksites');
  const tMaterials = useTranslations('materials');
  const locale = useLocale() as Locale;
  const canManage = usePermission(Permission.WORKSITE_MANAGE);
  const changes = useTaskMaterialChanges(worksiteId);
  const chip =
    'inline-flex items-center gap-1.5 rounded-full bg-neutral-subtle px-2.5 py-0.5 text-xs font-medium text-neutral-on-subtle';

  return (
    <li
      className="flex flex-col gap-2 border-t border-border py-3 first:border-t-0"
      style={{ paddingInlineStart: `${depth}rem` }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={depth === 0 ? 'font-semibold' : 'text-sm font-medium'}>{task.label}</span>
        {canManage && (
          <Button
            size="sm"
            onClick={() => onPlan(task)}
            aria-label={t('planMaterialFor', { label: task.label })}
          >
            {t('planMaterial')}
          </Button>
        )}
      </div>
      {needs.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {needs.map((need) => {
            const name = needLabel(need, locale);
            const text = [
              name,
              `${formatQuantity(need.quantity, locale)} ${tMaterials(`units.${need.unit}`)}`,
              ...(need.plannedCost == null ? [] : [formatAmount(need.plannedCost, locale)]),
            ].join(' · ');
            return (
              <li key={need.id} className={chip}>
                <MaterialIcon className="size-3.5" aria-hidden />
                {canManage ? (
                  <button
                    type="button"
                    className="hover:underline"
                    aria-label={t('editNeed', { name, label: task.label })}
                    onClick={() => onEdit(task, need)}
                  >
                    {text}
                  </button>
                ) : (
                  text
                )}
                {canManage && (
                  <button
                    type="button"
                    aria-label={t('removeFrom', { name, label: task.label })}
                    onClick={() => changes.remove.mutate(need.id)}
                  >
                    <CloseIcon className="size-3.5" aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/**
 * What each task of a phase is planned to need, material by material. A tab of
 * a worksite's page, handed to it by the route.
 */
export function TaskMaterials({
  worksiteId,
  initialPhaseIndex,
}: {
  worksiteId: string;
  /** The phase to open on: the first one not finished. */
  initialPhaseIndex: number;
}) {
  const t = useTranslations('myWorksites');
  const locale = useLocale() as Locale;
  const seesMoney = usePermission(Permission.BUDGET_READ);
  const plan = useWorksitePlan(worksiteId);
  const needs = useTaskMaterials(worksiteId);
  const [phaseIndex, setPhaseIndex] = useState(initialPhaseIndex);
  const [editing, setEditing] = useState<{
    task: IWorksiteTask;
    need: ITaskMaterial | null;
  } | null>(null);

  if (plan.isPending || needs.isPending) {
    return <Skeleton className="h-40 w-full" />;
  }
  const phases = plan.data?.tasks ?? [];
  if (phases.length === 0) {
    return (
      <EmptyState
        title={t('noPlanTitle')}
        description={t('noPlanDescription')}
        action={<ButtonLink href={`/worksites/${worksiteId}`}>{t('openPlanning')}</ButtonLink>}
      />
    );
  }
  const phase = phases[Math.min(phaseIndex, phases.length - 1)];
  const rows = (phase?.children ?? []).flatMap((task) => [
    { task, depth: 0 },
    ...task.children
      .filter((child) => child.level === PlanNodeLevel.SUBTASK)
      .map((child) => ({ task: child, depth: 1 })),
  ]);
  const all = needs.data ?? [];
  const inPhase = new Set(rows.map(({ task }) => task.id));
  const phaseCost = all
    .filter((need) => inPhase.has(need.taskId))
    .reduce((sum, need) => sum + (need.plannedCost ?? 0), 0);

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-60 flex-1 sm:max-w-sm">
          <Select
            label={t('phase')}
            options={phases.map((p, index) => ({ value: String(index), label: p.label }))}
            value={String(phaseIndex)}
            onChange={(event) => setPhaseIndex(Number(event.target.value))}
          />
        </div>
        {seesMoney ? (
          <p className="text-sm">
            {t('phaseMaterialsCost')}{' '}
            <span className="font-semibold tabular-nums">{formatAmount(phaseCost, locale)}</span>
          </p>
        ) : (
          <p className="text-sm text-fg-muted">{t('materialsHint')}</p>
        )}
      </div>
      <ul>
        {rows.map(({ task, depth }) => (
          <TaskRow
            key={task.id}
            worksiteId={worksiteId}
            task={task}
            depth={depth}
            needs={all.filter((need) => need.taskId === task.id)}
            onPlan={(target) => setEditing({ task: target, need: null })}
            onEdit={(target, need) => setEditing({ task: target, need })}
          />
        ))}
      </ul>
      {editing && (
        <NeedDialog
          key={editing.need?.id ?? editing.task.id}
          worksiteId={worksiteId}
          task={editing.task}
          need={editing.need}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
