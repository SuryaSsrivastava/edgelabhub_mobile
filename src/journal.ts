import type { JournalTrade } from "./api"

// Same working-out as the website's journal: a result taken from a statement is used as it is; otherwise from entry and exit (futures "1!" symbols carry a x20 point value).
export const pnlOf = (t: JournalTrade) =>
  t.pnl != null ? t.pnl : (t.exit - t.entry) * t.qty * (t.side === "Long" ? 1 : -1) * (t.symbol.endsWith("1!") ? 20 : 1) - (t.fees ?? 0)

export const rOf = (t: JournalTrade) => (t.risk > 0 ? pnlOf(t) / t.risk : 0)

export function journalStats(trades: JournalTrade[]) {
  const pnls = trades.map(pnlOf)
  const grossWin = pnls.filter((p) => p > 0).reduce((a, b) => a + b, 0)
  const grossLoss = -pnls.filter((p) => p < 0).reduce((a, b) => a + b, 0)
  const today = new Date().toDateString()
  return {
    count: trades.length,
    net: pnls.reduce((a, b) => a + b, 0),
    today: trades.filter((t) => new Date(t.opened_at).toDateString() === today).reduce((a, t) => a + pnlOf(t), 0),
    winRate: trades.length ? (pnls.filter((p) => p > 0).length / trades.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    wins: pnls.filter((p) => p > 0).length,
    avgWin: pnls.filter((p) => p > 0).length ? grossWin / pnls.filter((p) => p > 0).length : 0,
    avgLoss: pnls.filter((p) => p < 0).length ? -grossLoss / pnls.filter((p) => p < 0).length : 0,
    losses: pnls.filter((p) => p < 0).length,
    best: Math.max(0, ...pnls),
    worst: Math.min(0, ...pnls),
    avgR: trades.length ? trades.reduce((a, t) => a + rOf(t), 0) / trades.length : 0,
  }
}

/** "calm, fomo" -> ["calm", "fomo"]: what the member types into a labels field. */
export const splitLabels = (v: string) => [...new Set(v.split(",").map((x) => x.trim()).filter(Boolean))]

const dayKey = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }

/** Running total of results, oldest first: the equity curve of the journal. */
export function equityPoints(trades: JournalTrade[]): number[] {
  let run = 0
  return [0, ...[...trades].sort((a, b) => +new Date(a.exit_at ?? a.opened_at) - +new Date(b.exit_at ?? b.opened_at)).map((t) => (run += pnlOf(t)))]
}

/** Result per calendar day, keyed like the calendar's cells. */
export function pnlByDay(trades: JournalTrade[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const t of trades) m.set(dayKey(t.opened_at), (m.get(dayKey(t.opened_at)) ?? 0) + pnlOf(t))
  return m
}

/** Trades newest first, grouped by day, each group with its day total. */
export function groupByDay(trades: JournalTrade[]): { iso: string; total: number; trades: JournalTrade[] }[] {
  const out = new Map<string, { iso: string; total: number; trades: JournalTrade[] }>()
  for (const t of [...trades].sort((a, b) => +new Date(b.opened_at) - +new Date(a.opened_at))) {
    const k = dayKey(t.opened_at)
    const g = out.get(k) ?? { iso: t.opened_at, total: 0, trades: [] }
    g.total += pnlOf(t); g.trades.push(t); out.set(k, g)
  }
  return [...out.values()]
}

/** Only the trades of the last `days` days (0 means all of them). */
export const inRange = (trades: JournalTrade[], days: number) => (days === 0 ? trades : trades.filter((t) => +new Date(t.opened_at) >= Date.now() - days * 86_400_000))

/** Result per trading day, oldest first, the last `max` days that had trades. */
export function dailySeries(trades: JournalTrade[], max = 30): { iso: string; pnl: number; n: number }[] {
  const days = new Map<string, { iso: string; pnl: number; n: number }>()
  for (const t of trades) {
    const k = dayKey(t.opened_at)
    const d = days.get(k) ?? { iso: t.opened_at, pnl: 0, n: 0 }
    d.pnl += pnlOf(t); d.n++; days.set(k, d)
  }
  return [...days.values()].sort((a, b) => +new Date(a.iso) - +new Date(b.iso)).slice(-max)
}

/** Monday to Sunday: the result and count of the trades opened on each. */
export function weekdays(trades: JournalTrade[]): { label: string; pnl: number; n: number }[] {
  const out = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => ({ label, pnl: 0, n: 0 }))
  for (const t of trades) { const i = (new Date(t.opened_at).getDay() + 6) % 7; out[i].pnl += pnlOf(t); out[i].n++ }
  return out
}

/** Trades grouped by a label (setup, emotion, tag): count, net result and win rate of each, best first. */
export function breakdown(trades: JournalTrade[], labels: (t: JournalTrade) => string[]): { key: string; n: number; net: number; winRate: number }[] {
  const m = new Map<string, { n: number; net: number; wins: number }>()
  for (const t of trades) for (const k of labels(t)) {
    const g = m.get(k) ?? { n: 0, net: 0, wins: 0 }
    const p = pnlOf(t); g.n++; g.net += p; if (p > 0) g.wins++; m.set(k, g)
  }
  return [...m.entries()].map(([key, g]) => ({ key, n: g.n, net: g.net, winRate: (g.wins / g.n) * 100 })).sort((a, b) => b.net - a.net)
}

/** The biggest fall from a peak of the equity curve, as a positive amount. */
export function maxDrawdown(trades: JournalTrade[]): number {
  let peak = 0, worst = 0
  for (const v of equityPoints(trades)) { peak = Math.max(peak, v); worst = Math.max(worst, peak - v) }
  return worst
}

/** The run of wins (or losses) the latest trades are on, and the longest runs ever. */
export function streaks(trades: JournalTrade[]): { current: number; bestWin: number; worstLoss: number } {
  let current = 0, bestWin = 0, worstLoss = 0, w = 0, l = 0
  const asc = [...trades].sort((a, b) => +new Date(a.opened_at) - +new Date(b.opened_at))
  for (const t of asc) {
    const p = pnlOf(t)
    if (p > 0) { w++; l = 0 } else if (p < 0) { l++; w = 0 } else { w = 0; l = 0 }
    bestWin = Math.max(bestWin, w); worstLoss = Math.max(worstLoss, l)
    current = w > 0 ? w : l > 0 ? -l : 0
  }
  return { current, bestWin, worstLoss }
}
