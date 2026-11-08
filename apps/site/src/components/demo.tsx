'use client';

import { useMemo, useState } from 'react';
import type { Copy } from '@/content/copy';
import {
  alerts,
  INITIAL_STATE,
  isLate,
  labourCost,
  LAST_DAY,
  measure,
  modeKey,
  modeOf,
  money,
  type PayMode,
  PLANNED_END,
  quantity,
  TASKS,
  type TaskId,
  totals,
} from '@/demo/model';

type Tab = 'team' | 'materials' | 'equipment' | 'control';
const TAB_IDS: Tab[] = ['team', 'materials', 'equipment', 'control'];
const PAY_MODES: PayMode[] = [0, 1, 2];

const percent = (value: number) => `${(value * 100).toFixed(3)}%`;

/** A worksite the visitor can run forward: nothing here reaches a server. */
export function Demo({ t }: { t: Copy }) {
  const [state, setState] = useState(INITIAL_STATE);
  const [selected, setSelected] = useState<TaskId>('t2');
  const [tab, setTab] = useState<Tab>('team');

  const sums = useMemo(() => totals(state), [state]);
  const shownAlerts = useMemo(() => alerts(state, t), [state, t]);
  const task = TASKS.find((candidate) => candidate.id === selected) ?? TASKS[0];
  const row = measure(task, state, state.day);
  const gearPerDay = task.gear.reduce((sum, g) => sum + g.rate, 0);
  const over = sums.forecast > sums.budget;
  const isValidated = Boolean(state.validated[task.id]);

  return (
    <div className="demo">
      <div className="demo-top">
        <div>
          <h2 className="display">{t.tryTitle}</h2>
          <p className="muted">{t.tryHint}</p>
        </div>
        <div>
          <label htmlFor="day">
            Résidence Les Oliviers · {t.day} {state.day} {t.of}
          </label>
          <input
            id="day"
            className="range"
            type="range"
            dir="ltr"
            min={1}
            max={LAST_DAY}
            step={1}
            value={state.day}
            onChange={(event) => setState({ ...state, day: Number(event.target.value) })}
          />
        </div>
      </div>

      <div className="demo-body">
        <div className="gantt-col">
          <div className="gantt-scroll" dir="ltr">
            <div className="gantt">
              {TASKS.map((item) => {
                const progress = measure(item, state, state.day);
                return (
                  <div className="gantt-row" key={item.id}>
                    <button
                      type="button"
                      className="task-btn"
                      aria-pressed={selected === item.id}
                      dir="auto"
                      onClick={() => setSelected(item.id)}
                    >
                      {t.tasks[item.id]}
                    </button>
                    <div className="track">
                      <span
                        className="bar-plan"
                        style={{
                          left: percent((item.plan[0] - 1) / LAST_DAY),
                          width: percent((item.plan[1] - item.plan[0] + 1) / LAST_DAY),
                        }}
                      />
                      <span
                        className="bar-real"
                        style={{
                          left: percent((item.real[0] - 1) / LAST_DAY),
                          width: percent(progress.duration / LAST_DAY),
                        }}
                      >
                        <span
                          className="bar-done"
                          style={{
                            width: percent(progress.progress),
                            background: isLate(item, state.day) ? 'var(--orange)' : 'var(--blue)',
                          }}
                        />
                      </span>
                      <span
                        className="today"
                        style={{ left: percent((state.day - 0.5) / LAST_DAY) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="legend">
            <span>
              <i className="swatch" style={{ background: '#aeb9cf', height: 7 }} />
              {t.legendPlan}
            </span>
            <span>
              <i className="swatch" style={{ background: 'var(--blue)' }} />
              {t.legendOk}
            </span>
            <span>
              <i className="swatch" style={{ background: 'var(--orange)' }} />
              {t.legendLate}
            </span>
          </div>
        </div>

        <div className="detail">
          <strong className="detail-title">{t.tasks[task.id]}</strong>
          <div className="tabs">
            {TAB_IDS.map((id, index) => (
              <button
                key={id}
                type="button"
                className="tab"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                {t.tabs[index]}
              </button>
            ))}
          </div>

          {tab === 'team' && (
            <div className="stack">
              {task.crew.map((worker) => {
                const mode = modeOf(state, task, worker);
                return (
                  <div key={worker.id}>
                    <div className="line">
                      <bdi className="strong">{worker.name}</bdi>
                      <span className="nums" dir="ltr">
                        {money(labourCost(worker, mode, row.progress, row.days))}
                      </span>
                    </div>
                    <div className="modes">
                      {PAY_MODES.map((candidate) => (
                        <button
                          key={candidate}
                          type="button"
                          className="mode"
                          aria-pressed={mode === candidate}
                          onClick={() =>
                            setState({
                              ...state,
                              modes: { ...state.modes, [modeKey(task, worker)]: candidate },
                            })
                          }
                        >
                          {t.modes[candidate]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'materials' && (
            <div className="stack">
              {task.materials.map((material) => {
                const used = material.planned * material.overrun * row.progress;
                const exceeded = material.overrun > 1 && row.progress > 0;
                return (
                  <div key={material.key}>
                    <div className="line">
                      <span className="strong">{t.m[material.key]}</span>
                      <span className="nums small" dir="ltr">
                        {quantity(used)} / {quantity(material.planned)} {material.unit}
                      </span>
                    </div>
                    <div className="meter">
                      <span
                        style={{
                          width: percent(Math.min(1, used / material.planned)),
                          background: material.overrun >= 1.1 ? 'var(--orange)' : 'var(--blue)',
                        }}
                      />
                    </div>
                    <span className="small" style={{ color: exceeded ? '#9a3412' : 'var(--muted)' }}>
                      {exceeded ? t.over(Math.round((material.overrun - 1) * 100)) : t.asPlan}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'equipment' && (
            <div className="stack">
              {task.gear.map((gear) => (
                <div className="line" key={gear.name}>
                  <bdi className="strong">{gear.name}</bdi>
                  <span className="nums" dir="ltr">
                    {gear.rate} TND/j
                  </span>
                </div>
              ))}
              <p className="muted small">{t.gearTotal(row.days, money(gearPerDay * row.days))}</p>
            </div>
          )}

          {tab === 'control' && (
            <div className="stack">
              <p className="strong">{t.checks[task.id]}</p>
              <div className="compare">
                <div>{t.plan}</div>
                <div>{t.photo}</div>
              </div>
              <button
                type="button"
                className="validate"
                aria-pressed={isValidated}
                onClick={() =>
                  setState({
                    ...state,
                    validated: { ...state.validated, [task.id]: !isValidated },
                  })
                }
              >
                {isValidated ? t.validated : t.validate}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="muted small">{t.spent}</span>
          <strong className="display stat-value nums" dir="ltr">
            {money(sums.spent)}
          </strong>
          <div className="small">
            <div className="line">
              <span>{t.labor}</span>
              <span className="nums" dir="ltr">{money(sums.labour)}</span>
            </div>
            <div className="line">
              <span>{t.mat}</span>
              <span className="nums" dir="ltr">{money(sums.materials)}</span>
            </div>
            <div className="line">
              <span>{t.eng}</span>
              <span className="nums" dir="ltr">{money(sums.equipment)}</span>
            </div>
          </div>
        </div>
        <div className="stat">
          <span className="muted small">{t.forecast}</span>
          <strong
            className="display stat-value nums"
            dir="ltr"
            style={{ color: over ? '#9a3412' : '#166534' }}
          >
            {money(sums.forecast)}
          </strong>
          <span className="small">
            {t.budget} : <bdi className="nums">{money(sums.budget)}</bdi>
          </span>
          <strong className="small" style={{ color: over ? '#9a3412' : '#166534' }}>
            {state.day > 4 ? t.end(LAST_DAY, PLANNED_END) : t.onTime}
          </strong>
        </div>
        <div className="alerts" aria-live="polite">
          {shownAlerts.length === 0 && <div className="alert alert-ok">{t.allGood}</div>}
          {shownAlerts.map((alert) => (
            <div className={`alert alert-${alert.level}`} key={alert.text}>
              {alert.text}
            </div>
          ))}
        </div>
      </div>
      <p className="muted small">{t.example}</p>
    </div>
  );
}
