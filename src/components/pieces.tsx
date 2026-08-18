import { useState } from 'react'
import { TIERS, baht, type Field, type OtherItem, type Tier } from '../lib/pyramid'

export function Emblem({ children, accent }: { children: string; accent?: boolean }) {
  return (
    <span
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border text-lg"
      style={{
        borderColor: accent ? 'var(--accent)' : 'var(--border)',
        color: accent ? 'var(--accent)' : 'var(--foreground)',
        background: 'var(--card)',
      }}
    >
      {children}
    </span>
  )
}

export function Row({
  field,
  value,
  onChange,
  signed,
}: {
  field: Field
  value: number
  onChange: (v: string) => void
  signed?: boolean
}) {
  // Signed fields track raw text while editing so a lone "-" persists
  const [text, setText] = useState<string | null>(null)
  const display = signed ? (text ?? (value ? baht(value) : '')) : value ? baht(value) : ''
  return (
    <label className="group flex items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block truncate text-sm">{field.en}</span>
        {field.th && <span className="block truncate text-xs text-muted-foreground">{field.th}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <input
          inputMode={signed ? 'text' : 'numeric'}
          value={display}
          placeholder={signed ? '0 หรือ -0' : '0'}
          onChange={(e) => {
            if (signed) setText(e.target.value)
            onChange(e.target.value)
          }}
          onBlur={() => setText(null)}
          className={`w-28 rounded-md border border-transparent bg-secondary/60 px-2.5 py-1 text-right font-mono text-sm outline-none transition-colors group-hover:border-border focus:border-accent focus:bg-card md:w-36 ${
            signed && value < 0 ? 'text-accent' : ''
          }`}
        />
        <span className="font-mono text-[11px] text-muted-foreground">THB</span>
      </span>
    </label>
  )
}

/* Numeric input that optionally accepts a leading "-" (signed) and keeps the raw
   text while editing so a lone "-" persists; reports the parsed number upward. */
export function AmountInput({
  value,
  onChange,
  signed,
  className,
}: {
  value: number
  onChange: (n: number) => void
  signed?: boolean
  className?: string
}) {
  const [text, setText] = useState<string | null>(null)
  const display = signed ? (text ?? (value ? baht(value) : '')) : value ? baht(value) : ''
  const parse = (v: string) => {
    const c = signed
      ? v.replace(/[^0-9.-]/g, '').replace(/(?!^)-/g, '')
      : v.replace(/[^0-9.]/g, '')
    const n = Number(c)
    return Number.isFinite(n) ? n : 0
  }
  return (
    <input
      inputMode={signed ? 'text' : 'numeric'}
      value={display}
      placeholder={signed ? '0 หรือ -0' : '0'}
      onChange={(e) => {
        if (signed) setText(e.target.value)
        onChange(parse(e.target.value))
      }}
      onBlur={() => setText(null)}
      className={`${className ?? ''} ${signed && value < 0 ? 'text-accent' : ''}`}
    />
  )
}

/* Grouped horizontal bar chart — one bar per line item, grouped & colored by
   tier. Identity is carried by the per-tier heading and each bar's own label,
   so color only reinforces it (tier hues are the worksheet's fixed palette). */
export function BreakdownChart({
  amounts,
  groupItems,
  hovered,
  onHover,
}: {
  amounts: Record<string, number>
  groupItems: Record<string, OtherItem[]>
  hovered: Tier['id'] | null
  onHover: (id: Tier['id'] | null) => void
}) {
  const sections = TIERS.map((t) => {
    const items: { name: string; th?: string; value: number }[] = []
    for (const g of t.groups) {
      for (const f of g.fields) items.push({ name: f.en, th: f.th, value: amounts[f.key] || 0 })
      if (g.customKey)
        for (const o of groupItems[g.customKey] || [])
          if (o.amount > 0) items.push({ name: o.name || 'Others', value: o.amount })
    }
    for (const o of groupItems[t.id] || [])
      if (o.amount > 0) items.push({ name: o.name || 'Others', value: o.amount })
    const total = items.reduce((s, it) => s + it.value, 0)
    return { tier: t, items, total }
  })

  const max = Math.max(1, ...sections.flatMap((s) => s.items.map((it) => it.value)))

  return (
    <div className="flex flex-col gap-6">
      {sections.map(({ tier, items, total }) => (
        <div
          key={tier.id}
          onMouseEnter={() => onHover(tier.id)}
          onMouseLeave={() => onHover(null)}
          style={{
            opacity: hovered === null || hovered === tier.id ? 1 : 0.4,
            transition: 'opacity 0.3s ease',
          }}
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: tier.color }} />
              <span className="text-sm font-medium">{tier.en}</span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">{baht(total)} THB</span>
          </div>
          <div className="flex flex-col gap-2">
            {items.map((it, i) => (
              <div key={i}>
                <div className="mb-0.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs">
                    {it.name}
                    {it.th && <span className="ml-1.5 text-muted-foreground">{it.th}</span>}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{baht(it.value)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(Math.max(0, it.value) / max) * 100}%`, background: tier.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
