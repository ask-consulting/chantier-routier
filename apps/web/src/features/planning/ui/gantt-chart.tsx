'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { scheduleWindow, type IWorksiteTask, PlanNodeLevel } from '@chantia/shared';
import { intlLocale, type Locale } from '@/shared/i18n/config';
import { formatDate } from '@/shared/lib/format';
import { ChevronDownIcon, ChevronRightIcon } from '@/shared/lib/icons';
import { cn } from '@/shared/lib/cn';
import {
  barPosition,
  initiallyCollapsed,
  monthTicks,
  todayPosition,
  visibleRows,
} from '../model/gantt';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const percent = (value: number): string => `${value.toFixed(3)}%`;
const LABEL_COLUMN = 'grid grid-cols-[minmax(10rem,20rem)_minmax(0,1fr)] items-center gap-2';

/**
 * The planning as a Gantt chart: a line per phase, task and subtask.
 *
 * Time always runs left to right, Arabic included (`dir="ltr"`), while each
 * label keeps its own direction. A phase's bar is its lines' span.
 */
export function GanttChart({
  tasks,
  onEdit,
}: {
  tasks: readonly IWorksiteTask[];
  /** Absent for whoever cannot move a line. */
  onEdit?: (task: IWorksiteTask) => void;
}) {
  const t = useTranslations('planning');
  const locale = useLocale() as Locale;
  const [collapsed, setCollapsed] = useState(() => initiallyCollapsed(tasks));
  const window = useMemo(() => scheduleWindow(tasks), [tasks]);
  const rows = useMemo(() => visibleRows(tasks, collapsed), [tasks, collapsed]);

  if (!window) {
    return <p className="text-sm text-fg-muted">{t('noDates')}</p>;
  }

  const months = new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
  const now = todayPosition(today(), window);
  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  return (
    <div className="overflow-x-auto" dir="ltr">
      <div className="min-w-[36rem] text-sm">
        <div className={cn(LABEL_COLUMN, 'mb-1')}>
          <span />
          <div className="relative h-5 text-xs text-fg-muted">
            {monthTicks(window).map((tick) => (
              <span
                key={tick.day}
                className="absolute top-0 whitespace-nowrap"
                style={{ left: percent(tick.left) }}
              >
                {months.format(new Date(`${tick.day}T00:00:00.000Z`))}
              </span>
            ))}
          </div>
        </div>

        <ul className="flex flex-col gap-0.5">
          {rows.map(({ task, depth }) => {
            const expandable = task.children.length > 0;
            const editable = !expandable && onEdit;
            const dates = `${formatDate(task.plannedStart, locale)} – ${formatDate(task.plannedEnd, locale)}`;
            return (
              <li key={task.id} className={LABEL_COLUMN}>
                <div className="flex min-w-0 items-center" style={{ paddingLeft: `${depth}rem` }}>
                  {expandable ? (
                    <button
                      type="button"
                      className="me-1 shrink-0 text-fg-muted"
                      aria-expanded={!collapsed.has(task.id)}
                      aria-label={t('toggle', { label: task.label })}
                      onClick={() => toggle(task.id)}
                    >
                      {collapsed.has(task.id) ? (
                        <ChevronRightIcon className="size-4" aria-hidden />
                      ) : (
                        <ChevronDownIcon className="size-4" aria-hidden />
                      )}
                    </button>
                  ) : (
                    <span className="me-1 w-4 shrink-0" />
                  )}
                  {task.isControl && (
                    <span className="me-1 shrink-0 text-signal" title={t('control')}>
                      <span aria-hidden>◆</span>
                      <span className="sr-only">{t('control')}</span>
                    </span>
                  )}
                  {editable ? (
                    <button
                      type="button"
                      dir="auto"
                      className="min-w-0 truncate text-start hover:underline"
                      title={task.label}
                      aria-label={t('editDates', { label: task.label })}
                      onClick={() => onEdit(task)}
                    >
                      {task.label}
                    </button>
                  ) : (
                    <span
                      dir="auto"
                      title={task.label}
                      className={cn(
                        'min-w-0 truncate',
                        task.level === PlanNodeLevel.PHASE && 'font-semibold',
                      )}
                    >
                      {task.label}
                    </span>
                  )}
                </div>

                <div className="relative h-6 rounded bg-surface-muted">
                  {task.plannedStart && task.plannedEnd && (
                    <span
                      title={dates}
                      className={cn(
                        'absolute rounded',
                        expandable ? 'inset-y-2 bg-fg-subtle' : 'inset-y-1',
                        !expandable && (task.isControl ? 'bg-signal' : 'bg-primary'),
                      )}
                      style={{
                        left: percent(barPosition(task.plannedStart, task.plannedEnd, window).left),
                        minWidth: '3px',
                        width: percent(
                          barPosition(task.plannedStart, task.plannedEnd, window).width,
                        ),
                      }}
                    />
                  )}
                  {now !== null && (
                    <span
                      className="absolute inset-y-0 w-px bg-danger"
                      style={{ left: percent(now) }}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
