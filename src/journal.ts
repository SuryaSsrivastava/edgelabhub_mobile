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
    avgR: trades.length ? trades.reduce((a, t) => a + rOf(t), 0) / trades.length : 0,
  }
}

/** "calm, fomo" -> ["calm", "fomo"]: what the member types into a labels field. */
export const splitLabels = (v: string) => [...new Set(v.split(",").map((x) => x.trim()).filter(Boolean))]
