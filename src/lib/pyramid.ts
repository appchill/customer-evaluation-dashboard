/* ------------------------------------------------------------------ */
/*  Data model — the three tiers of the Pyramid of Financial Planning */
/* ------------------------------------------------------------------ */

export type Field = { key: string; en: string; th?: string }
export type Group = {
  label?: { en: string; th?: string }
  fields: Field[]
  customKey?: string
  signed?: boolean
  signedCustom?: boolean
  // Also show this group's own subtotal at its heading (it still counts toward the tier total).
  separateTotal?: boolean
}

export type Tier = {
  id: 'invest' | 'accum' | 'basic'
  en: string
  th: string
  caption: { en: string; th: string }
  color: string
  colorDeep: string
  groups: Group[]
}

export type OtherItem = { id: number; name: string; amount: number }

export type CustomerData = {
  customer: string
  goals: string[]
  amounts: Record<string, number>
  others: OtherItem[]
  groupItems: Record<string, OtherItem[]>
}

export const TIERS: Tier[] = [
  {
    id: 'invest',
    en: 'Investment',
    th: 'การลงทุน',
    caption: { en: 'INVESTMENT', th: 'การลงทุน' },
    color: 'var(--tier-invest)',
    colorDeep: 'var(--tier-invest-deep)',
    groups: [
      {
        fields: [
          { key: 'house_car', en: 'Stock', th: 'หุ้น' },
          { key: 'travelling', en: 'Fund', th: 'กองทุน' },
          { key: 'etc', en: 'Gold', th: 'ทอง' },
        ],
      },
    ],
  },
  {
    id: 'accum',
    en: 'Accumulation',
    th: 'การเก็บสะสม',
    caption: { en: 'ACCUMULATION', th: 'การเก็บสะสม' },
    color: 'var(--tier-accum)',
    colorDeep: 'var(--tier-accum-deep)',
    groups: [
      {
        fields: [
          { key: 'retirement', en: 'Retirement Plan', th: 'วางแผนเกษียณ' },
          { key: 'education_fund', en: 'Education Plan', th: 'แผนการศึกษา' },
          { key: 'tax', en: 'Tax Planning', th: 'การวางแผนภาษี' },
        ],
      },
    ],
  },
  {
    id: 'basic',
    en: 'Basic Need & Risk Management',
    th: 'ความจำเป็นพื้นฐาน และการจัดการความเสี่ยง',
    caption: { en: 'BASIC NEED · RISK MANAGEMENT', th: 'ความจำเป็นพื้นฐาน · การจัดการความเสี่ยง' },
    color: 'var(--tier-basic)',
    colorDeep: 'var(--tier-basic-deep)',
    groups: [
      {
        label: { en: 'Protection', th: 'ความคุ้มครอง' },
        customKey: 'life_ins',
        signedCustom: true,
        fields: [
          { key: 'protection', en: 'Life Insure', th: 'ความคุ้มครองทุนชีวิต' },
          { key: 'income', en: 'Health Protection', th: 'ประกันสุขภาพ' },
          { key: 'education', en: 'CI', th: 'โรคร้ายแรง' },
        ],
      },
      {
        label: { en: 'Liquidity', th: 'สภาพคล่อง' },
        customKey: 'liquidity',
        signed: true,
        signedCustom: true,
        separateTotal: true,
        fields: [
          { key: 'money_market', en: 'Liquidity Assets', th: 'สินทรัพย์สภาพคล่องสูง' },
          { key: 'saving', en: 'Saving Account', th: 'บัญชีออมทรัพย์' },
          { key: 'fixed', en: 'Fixed Account', th: 'บัญชีฝากประจำ' },
          { key: 'debt', en: 'Debt', th: 'ภาระหนี้สิน' },
        ],
      },
    ],
  },
]

export const ALL_KEYS = TIERS.flatMap((t) => t.groups.flatMap((g) => g.fields.map((f) => f.key)))

export function blankCustomerData(): CustomerData {
  return {
    customer: '',
    goals: ['', '', '', ''],
    amounts: {},
    others: [{ id: 1, name: '', amount: 0 }],
    groupItems: { life_ins: [] },
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export const baht = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n || 0)

// Triangle geometry for the pyramid SVG
export const APEX_Y = 18
export const BASE_Y = 262
export const CX = 150
export const HALF = 132
export const xEdge = (y: number, sign: 1 | -1) => CX + sign * HALF * ((y - APEX_Y) / (BASE_Y - APEX_Y))

// tier vertical bands (apex → base)
export const BANDS: Record<Tier['id'], [number, number]> = {
  invest: [APEX_Y, 99],
  accum: [99, 180],
  basic: [180, BASE_Y],
}

export function tierPolys(id: Tier['id']) {
  const [y0, y1] = BANDS[id]
  const lT = xEdge(y0, -1)
  const rT = xEdge(y0, 1)
  const lB = xEdge(y1, -1)
  const rB = xEdge(y1, 1)
  const full = `${lT},${y0} ${rT},${y0} ${rB},${y1} ${lB},${y1}`
  const right = `${CX},${y0} ${rT},${y0} ${rB},${y1} ${CX},${y1}`
  return { full, right, mid: (y0 + y1) / 2 }
}

/** A single group's own total (fixed fields + its custom rows). */
export function groupSubtotal(g: Group, amounts: Record<string, number>, groupItems: Record<string, OtherItem[]>) {
  let sum = g.fields.reduce((s, f) => s + (amounts[f.key] || 0), 0)
  if (g.customKey) sum += (groupItems[g.customKey] || []).reduce((s, o) => s + (o.amount || 0), 0)
  return sum
}

export function computeTotals(data: CustomerData) {
  const amounts = data.amounts || {}
  const groupItems = data.groupItems || {}
  const others = data.others || []

  const tierTotals = {} as Record<Tier['id'], number>
  for (const t of TIERS) {
    let sum = 0
    for (const g of t.groups) {
      // Liquidity (and any other separateTotal group) still counts toward the
      // tier/grand total — separateTotal only adds an extra subtotal label.
      sum += g.fields.reduce((s, f) => s + (amounts[f.key] || 0), 0)
      if (g.customKey) sum += (groupItems[g.customKey] || []).reduce((s, o) => s + (o.amount || 0), 0)
    }
    sum += (groupItems[t.id] || []).reduce((s, o) => s + (o.amount || 0), 0)
    tierTotals[t.id] = sum
  }

  const othersTotal = others.reduce((s, o) => s + (o.amount || 0), 0)
  const grand = TIERS.reduce((s, t) => s + tierTotals[t.id], 0) + othersTotal

  return { tierTotals, othersTotal, grand }
}
