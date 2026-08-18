import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import {
  APEX_Y,
  BASE_Y,
  CX,
  TIERS,
  baht,
  computeTotals,
  groupSubtotal as computeGroupSubtotal,
  tierPolys,
  xEdge,
  type CustomerData,
  type OtherItem,
  type Tier,
} from '../lib/pyramid'
import { AmountInput, BreakdownChart, Emblem, Row } from './pieces'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function Assessment({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<CustomerData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hovered, setHovered] = useState<Tier['id'] | null>(null)
  const [status, setStatus] = useState<SaveStatus>('idle')

  const loaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loaded.current = false
    api
      .get(id)
      .then((record) => {
        setData(record.data)
        loaded.current = true
      })
      .catch((e) => setLoadError(e.message))
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [id])

  useEffect(() => {
    if (!data || !loaded.current) return
    setStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const { grand } = computeTotals(data)
      api
        .update(id, { name: data.customer, grand, data })
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'))
    }, 700)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, id])

  if (loadError) {
    return (
      <div className="min-h-screen bg-background p-10 text-foreground">
        <p className="text-accent">{loadError}</p>
        <button type="button" onClick={onBack} className="mt-4 font-mono text-sm text-accent underline">
          ← กลับหน้า Dashboard
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background p-10 text-foreground">
        <p className="font-mono text-sm text-muted-foreground">กำลังโหลดข้อมูล…</p>
      </div>
    )
  }

  const { amounts, goals, others, groupItems, customer } = data
  const { tierTotals, othersTotal, grand } = computeTotals(data)

  const setAmount = (key: string, v: string, signed = false) => {
    const cleaned = signed
      ? v.replace(/[^0-9.-]/g, '').replace(/(?!^)-/g, '')
      : v.replace(/[^0-9.]/g, '')
    const n = Number(cleaned)
    setData((prev) => (prev ? { ...prev, amounts: { ...prev.amounts, [key]: Number.isFinite(n) ? n : 0 } } : prev))
  }

  const setCustomerName = (name: string) => setData((prev) => (prev ? { ...prev, customer: name } : prev))
  const setGoal = (i: number, value: string) =>
    setData((prev) => (prev ? { ...prev, goals: prev.goals.map((g, j) => (j === i ? value : g)) } : prev))

  const addOther = () =>
    setData((prev) => {
      if (!prev || prev.others.length >= 5) return prev
      return { ...prev, others: [...prev.others, { id: Date.now(), name: '', amount: 0 }] }
    })
  const removeOther = (oid: number) =>
    setData((prev) => (prev ? { ...prev, others: prev.others.filter((o) => o.id !== oid) } : prev))
  const updateOther = (oid: number, patch: Partial<OtherItem>) =>
    setData((prev) =>
      prev ? { ...prev, others: prev.others.map((o) => (o.id === oid ? { ...o, ...patch } : o)) } : prev,
    )

  const addGroupItem = (key: string, max = 3) =>
    setData((prev) => {
      if (!prev) return prev
      const list = prev.groupItems[key] || []
      if (list.length >= max) return prev
      return { ...prev, groupItems: { ...prev.groupItems, [key]: [...list, { id: Date.now(), name: '', amount: 0 }] } }
    })
  const removeGroupItem = (key: string, oid: number) =>
    setData((prev) =>
      prev
        ? { ...prev, groupItems: { ...prev.groupItems, [key]: (prev.groupItems[key] || []).filter((o) => o.id !== oid) } }
        : prev,
    )
  const updateGroupItem = (key: string, oid: number, patch: Partial<OtherItem>) =>
    setData((prev) =>
      prev
        ? {
            ...prev,
            groupItems: {
              ...prev.groupItems,
              [key]: (prev.groupItems[key] || []).map((o) => (o.id === oid ? { ...o, ...patch } : o)),
            },
          }
        : prev,
    )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1240px] px-6 py-10 md:px-10 md:py-14">
        {/* ---------------- Header ---------------- */}
        <header className="mb-10 flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground transition-colors hover:text-accent"
            >
              ← Dashboard
            </button>
            <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-accent">
              Financial Assessment · แบบประเมินลูกค้า
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-[0.95] tracking-tight md:text-6xl">
              Life Plan
            </h1>
            <p className="mt-2 font-display text-lg italic text-muted-foreground">
              Pyramid of Financial Planning — ปิรามิดการวางแผนการเงิน
            </p>
          </div>
          <div className="md:text-right">
            <label className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Client · ลูกค้า
            </label>
            <input
              value={customer}
              placeholder="ระบุชื่อลูกค้า"
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-right font-display text-lg outline-none transition-colors focus:border-accent md:w-72"
            />
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {status === 'saving' && 'กำลังบันทึก…'}
              {status === 'saved' && 'บันทึกแล้ว ✓'}
              {status === 'error' && <span className="text-accent">บันทึกไม่สำเร็จ ลองอีกครั้ง</span>}
            </p>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
          {/* ============ LEFT COLUMN ============ */}
          <div className="flex flex-col gap-8">
            {/* Life Goal */}
            <section className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
              <div className="mb-5 flex items-center gap-3">
                <Emblem>{'\u{1F3DB}'}</Emblem>
                <div>
                  <h2 className="font-display text-xl font-semibold">Life Goal</h2>
                  <p className="text-xs text-muted-foreground">เป้าหมายชีวิต</p>
                </div>
              </div>
              <ol className="flex flex-col gap-3">
                {goals.map((g, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="font-mono text-sm text-muted-foreground">{i + 1})</span>
                    <input
                      value={g}
                      placeholder="…"
                      onChange={(e) => setGoal(i, e.target.value)}
                      className="w-full border-b border-border bg-transparent pb-1 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-accent"
                    />
                  </li>
                ))}
              </ol>
            </section>

            {/* Pyramid */}
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-semibold">Pyramid of Financial Planning</h2>
              <p className="mb-4 text-xs text-muted-foreground">ปิรามิดการวางแผนการเงิน</p>

              <svg viewBox="0 0 300 300" className="mx-auto block w-full max-w-[360px]">
                {TIERS.map((t) => {
                  const p = tierPolys(t.id)
                  const active = hovered === null || hovered === t.id
                  const share = grand ? Math.round((tierTotals[t.id] / grand) * 100) : 0
                  return (
                    <g
                      key={t.id}
                      onMouseEnter={() => setHovered(t.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ opacity: active ? 1 : 0.32, transition: 'opacity 0.35s ease', cursor: 'pointer' }}
                    >
                      <polygon points={p.full} fill={t.color} />
                      <polygon points={p.right} fill={t.colorDeep} />
                      <text
                        x={CX}
                        y={p.mid + 5}
                        textAnchor="middle"
                        className="font-mono"
                        fill="#ffffff"
                        fontSize="15"
                        fontWeight="600"
                        style={{ pointerEvents: 'none' }}
                      >
                        {share}%
                      </text>
                    </g>
                  )
                })}
                <polygon
                  points={`${CX},${APEX_Y} ${xEdge(BASE_Y, 1)},${BASE_Y} ${xEdge(BASE_Y, -1)},${BASE_Y}`}
                  fill="none"
                  stroke="rgba(0,0,0,0.15)"
                  strokeWidth="1"
                  style={{ pointerEvents: 'none' }}
                />
              </svg>

              <ul className="mt-4 flex flex-col gap-2">
                {[...TIERS].reverse().map((t) => (
                  <li
                    key={t.id}
                    onMouseEnter={() => setHovered(t.id)}
                    onMouseLeave={() => setHovered(null)}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors"
                    style={{ background: hovered === t.id ? 'var(--secondary)' : 'transparent' }}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: t.color }} />
                      <span className="text-sm font-medium">{t.caption.en}</span>
                      <span className="text-xs text-muted-foreground">{t.caption.th}</span>
                    </span>
                    <span className="font-mono text-sm">{baht(tierTotals[t.id])}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Breakdown chart */}
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-semibold">Allocation Breakdown</h2>
              <p className="mb-5 text-xs text-muted-foreground">สัดส่วนเงินในแต่ละรายการทั้งหมด</p>
              <BreakdownChart amounts={amounts} groupItems={groupItems} hovered={hovered} onHover={setHovered} />
            </section>
          </div>

          {/* ============ RIGHT COLUMN ============ */}
          <div className="flex flex-col gap-6">
            {/* Total invested */}
            <section className="rounded-xl border border-accent/30 bg-card p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Emblem accent>{'\u{1F4B0}'}</Emblem>
                  <div>
                    <h2 className="font-display text-xl font-semibold">Total Money Invested</h2>
                    <p className="text-xs text-muted-foreground">เงินลงทุนทั้งหมด</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-3xl font-semibold md:text-4xl">{baht(grand)}</span>
                  <span className="ml-2 font-mono text-sm text-muted-foreground">THB</span>
                </div>
              </div>
              <div className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                {TIERS.map((t) => (
                  <div
                    key={t.id}
                    style={{ width: `${grand ? (tierTotals[t.id] / grand) * 100 : 0}%`, background: t.color }}
                    className="h-full transition-all duration-500"
                  />
                ))}
                <div
                  style={{ width: `${grand ? (othersTotal / grand) * 100 : 0}%`, background: 'var(--muted-foreground)' }}
                  className="h-full transition-all duration-500"
                />
              </div>
            </section>

            {/* Tier detail cards */}
            {TIERS.map((t) => (
              <section
                key={t.id}
                onMouseEnter={() => setHovered(t.id)}
                onMouseLeave={() => setHovered(null)}
                className="rounded-xl border bg-card p-6 transition-shadow"
                style={{
                  borderColor: hovered === t.id ? t.color : 'var(--border)',
                  boxShadow: hovered === t.id ? `0 6px 24px -12px ${t.color}` : 'none',
                }}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-block h-4 w-4 rounded-[4px]" style={{ background: t.color }} />
                    <div>
                      <h3 className="font-display text-lg font-semibold leading-tight">{t.en}</h3>
                      <p className="text-xs text-muted-foreground">{t.th}</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-medium">{baht(tierTotals[t.id])} THB</span>
                </div>

                <div className="flex flex-col gap-4">
                  {t.groups.map((g, gi) => (
                    <div key={gi} className={g.label ? 'rounded-lg bg-secondary/50 p-3' : ''}>
                      {g.label && (
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-secondary-foreground">
                            {g.label.en}
                            <span className="ml-2 tracking-normal normal-case text-muted-foreground">{g.label.th}</span>
                          </p>
                          {g.separateTotal && (
                            <span className="shrink-0 font-mono text-xs font-medium tabular-nums">
                              {baht(computeGroupSubtotal(g, amounts, groupItems))} THB
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex flex-col divide-y divide-border">
                        {g.fields.map((f) => (
                          <Row
                            key={f.key}
                            field={f}
                            value={amounts[f.key] || 0}
                            signed={g.signed}
                            onChange={(v) => setAmount(f.key, v, g.signed)}
                          />
                        ))}
                        {g.customKey &&
                          (groupItems[g.customKey] || []).map((o) => (
                            <div key={o.id} className="flex items-center gap-2 py-2">
                              <input
                                value={o.name}
                                placeholder="ระบุรายการ / Item"
                                onChange={(e) => updateGroupItem(g.customKey!, o.id, { name: e.target.value })}
                                className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-2.5 py-1 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-accent"
                              />
                              <AmountInput
                                value={o.amount}
                                signed={g.signedCustom}
                                onChange={(n) => updateGroupItem(g.customKey!, o.id, { amount: n })}
                                className="w-24 shrink-0 rounded-md border border-transparent bg-secondary/60 px-2.5 py-1 text-right font-mono text-sm outline-none transition-colors focus:border-accent focus:bg-card md:w-28"
                              />
                              <button
                                type="button"
                                onClick={() => removeGroupItem(g.customKey!, o.id)}
                                aria-label="ลบรายการ"
                                className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                              >
                                <span aria-hidden>{'−'}</span>
                              </button>
                            </div>
                          ))}
                      </div>
                      {g.customKey && (
                        <button
                          type="button"
                          onClick={() => addGroupItem(g.customKey!)}
                          disabled={(groupItems[g.customKey] || []).length >= 3}
                          className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground"
                        >
                          <span>{'+ Others/ Add'}</span>
                          <span className="tracking-normal">{'(' + (groupItems[g.customKey] || []).length + '/3)'}</span>
                        </button>
                      )}
                    </div>
                  ))}

                  {(t.id === 'accum' || t.id === 'invest') && (
                    <div className="border-t border-dashed border-border pt-3">
                      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-secondary-foreground">
                        Others
                        <span className="ml-2 tracking-normal normal-case text-muted-foreground">อื่นๆ</span>
                      </p>
                      <div className="flex flex-col gap-2">
                        {(groupItems[t.id] || []).map((o) => (
                          <div key={o.id} className="flex items-center gap-2">
                            <input
                              value={o.name}
                              placeholder="ระบุรายการ / Item"
                              onChange={(e) => updateGroupItem(t.id, o.id, { name: e.target.value })}
                              className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-2.5 py-1 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-accent"
                            />
                            <input
                              inputMode="numeric"
                              value={o.amount ? baht(o.amount) : ''}
                              placeholder="0"
                              onChange={(e) =>
                                updateGroupItem(t.id, o.id, { amount: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0 })
                              }
                              className="w-24 shrink-0 rounded-md border border-transparent bg-secondary/60 px-2.5 py-1 text-right font-mono text-sm outline-none transition-colors focus:border-accent focus:bg-card md:w-28"
                            />
                            <button
                              type="button"
                              onClick={() => removeGroupItem(t.id, o.id)}
                              aria-label="ลบรายการ"
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                            >
                              <span aria-hidden>{'−'}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => addGroupItem(t.id, 5)}
                        disabled={(groupItems[t.id] || []).length >= 5}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground"
                      >
                        <span>{'+ Others / Add'}</span>
                        <span className="tracking-normal">{'(' + (groupItems[t.id] || []).length + '/5)'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </section>
            ))}

            {/* อื่นๆ — custom line items (max 5) */}
            <section className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-block h-4 w-4 rounded-[4px] bg-muted-foreground" />
                  <div>
                    <h3 className="font-display text-lg font-semibold leading-tight">Others</h3>
                    <p className="text-xs text-muted-foreground">อื่นๆ</p>
                  </div>
                </div>
                <span className="font-mono text-sm font-medium">{baht(othersTotal)} THB</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {others.map((o) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <input
                      value={o.name}
                      placeholder="ระบุรายการ / Item name"
                      onChange={(e) => updateOther(o.id, { name: e.target.value })}
                      className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-accent"
                    />
                    <span className="flex shrink-0 items-center gap-1.5">
                      <input
                        inputMode="numeric"
                        value={o.amount ? baht(o.amount) : ''}
                        placeholder="0"
                        onChange={(e) => updateOther(o.id, { amount: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0 })}
                        className="w-28 rounded-md border border-transparent bg-secondary/60 px-2.5 py-1.5 text-right font-mono text-sm outline-none transition-colors hover:border-border focus:border-accent focus:bg-card md:w-32"
                      />
                      <span className="font-mono text-[11px] text-muted-foreground">THB</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeOther(o.id)}
                      disabled={others.length === 1}
                      aria-label="ลบรายการ"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted-foreground"
                    >
                      <span aria-hidden>{'−'}</span>
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addOther}
                disabled={others.length >= 5}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground"
              >
                <span>{'+ เพิ่มช่อง / Add row'}</span>
                <span className="tracking-normal">{'(' + others.length + '/5)'}</span>
              </button>
            </section>
          </div>
        </div>

        <footer className="mt-12 flex flex-col items-center gap-1 border-t border-border pt-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            Prepared for {customer || '—'} · {new Date().toLocaleDateString('th-TH')}
          </p>
          <p className="text-xs text-muted-foreground/70">
            แบบประเมินการวางแผนการเงินเชิงปิรามิด — เพื่อการให้คำปรึกษาเท่านั้น
          </p>
        </footer>
      </div>
    </div>
  )
}
