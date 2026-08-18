import { useEffect, useMemo, useState } from 'react'
import { api, type CustomerSummary } from '../lib/api'
import { TIERS, baht, blankCustomerData, computeTotals } from '../lib/pyramid'

export default function Dashboard({ onOpen }: { onOpen: (id: string) => void }) {
  const [customers, setCustomers] = useState<CustomerSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const load = () => {
    api
      .list()
      .then(setCustomers)
      .catch((e) => setError(e.message))
  }

  useEffect(load, [])

  const filtered = useMemo(() => {
    if (!customers) return []
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => (c.name || 'ยังไม่ระบุชื่อ').toLowerCase().includes(q))
  }, [customers, query])

  const createCustomer = async () => {
    setCreating(true)
    try {
      const record = await api.create({ name: '', grand: 0, data: blankCustomerData() })
      onOpen(record.id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const removeCustomer = async (id: string, name: string) => {
    if (!window.confirm(`ลบข้อมูลของ "${name || 'ยังไม่ระบุชื่อ'}" ใช่หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้`)) return
    try {
      await api.remove(id)
      setCustomers((prev) => (prev ? prev.filter((c) => c.id !== id) : prev))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1240px] px-6 py-10 md:px-10 md:py-14">
        <header className="mb-10 flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-accent">
              Financial Assessment · แบบประเมินลูกค้า
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-[0.95] tracking-tight md:text-6xl">
              Client Dashboard
            </h1>
            <p className="mt-2 font-display text-lg italic text-muted-foreground">
              ภาพรวมพีระมิดการวางแผนการเงินของลูกค้าทุกคน
            </p>
          </div>
          <div className="flex items-center gap-3 md:justify-end">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อลูกค้า…"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-accent md:w-56"
            />
            <button
              type="button"
              onClick={createCustomer}
              disabled={creating}
              className="shrink-0 rounded-md bg-accent px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {'+ ลูกค้าใหม่'}
            </button>
          </div>
        </header>

        {error && (
          <p className="mb-6 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">
            {error}
          </p>
        )}

        {customers === null && !error && (
          <p className="font-mono text-sm text-muted-foreground">กำลังโหลดข้อมูล…</p>
        )}

        {customers && customers.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-display text-xl font-semibold">ยังไม่มีข้อมูลลูกค้า</p>
            <p className="mt-1 text-sm text-muted-foreground">
              กด "+ ลูกค้าใหม่" เพื่อเริ่มทำแบบประเมินพีระมิดการเงินคนแรก
            </p>
          </div>
        )}

        {customers && customers.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">ไม่พบลูกค้าที่ตรงกับ "{query}"</p>
        )}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const { tierTotals, grand } = computeTotals(c.data)
            return (
              <div
                key={c.id}
                className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)]"
              >
                <button type="button" onClick={() => onOpen(c.id)} className="text-left">
                  <h3 className="font-display text-lg font-semibold leading-tight">
                    {c.name || 'ยังไม่ระบุชื่อ'}
                  </h3>
                  <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    อัปเดตล่าสุด {new Date(c.updatedAt).toLocaleString('th-TH')}
                  </p>
                </button>

                <button type="button" onClick={() => onOpen(c.id)} className="text-left">
                  <span className="font-mono text-2xl font-semibold">{baht(grand)}</span>
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">THB</span>
                </button>

                <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                  {TIERS.map((t) => (
                    <div
                      key={t.id}
                      style={{ width: `${grand ? (tierTotals[t.id] / grand) * 100 : 0}%`, background: t.color }}
                      className="h-full"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(c.id)}
                    className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent transition-opacity hover:opacity-80"
                  >
                    เปิดดู/แก้ไข →
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCustomer(c.id, c.name)}
                    aria-label="ลบลูกค้า"
                    className="rounded-md border border-border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground opacity-0 transition-colors hover:border-accent hover:text-accent group-hover:opacity-100"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
