import { Text, View } from "react-native"
import type { JournalTrade } from "./api"
import { Press } from "./fx"
import { clock, money } from "./format"
import { pnlOf, rOf } from "./journal"
import { ShotBadge, TradeShots } from "./shots"
import { colors } from "./theme"
import { Card, Muted, Row, tone } from "./ui"

const sgn = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`

/** Every trade of the picked day, with its result, its note and its screenshots. */
export function DayTrades({ day, trades, counts, onOpen }: { day: Date; trades: JournalTrade[]; counts: Record<string, number>; onOpen: (id: number) => void }) {
  const same = (iso: string) => new Date(iso).toDateString() === day.toDateString()
  const list = trades.filter((t) => same(t.opened_at)).sort((a, b) => +new Date(a.opened_at) - +new Date(b.opened_at))
  const total = list.reduce((sum, t) => sum + pnlOf(t), 0)
  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{day.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</Text>
        {list.length > 0 ? <Text style={{ color: tone(total), fontSize: 15, fontWeight: "800" }}>{money(total, "USD", true)}</Text> : null}
      </Row>
      {list.length === 0 ? <Muted style={{ marginTop: 6 }}>No trades on this day.</Muted> : list.map((t, i) => {
        const p = pnlOf(t)
        return (
          <View key={t.id} style={{ paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: `${colors.border}99`, marginTop: i === 0 ? 6 : 0 }}>
            <Press onPress={() => onOpen(t.id)}>
              <Row style={{ justifyContent: "space-between" }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Row><Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{t.symbol} <Text style={{ color: t.side === "Short" ? colors.red : colors.green, fontSize: 11, fontWeight: "700" }}>{t.side.toUpperCase()}</Text></Text><ShotBadge n={counts[t.id]} /></Row>
                  <Muted>{clock(t.opened_at)}{t.setup ? ` · ${t.setup}` : ""}</Muted>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: tone(p), fontSize: 15, fontWeight: "800" }}>{money(p, "USD", true)}</Text>
                  <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>{sgn(rOf(t))}R</Text>
                </View>
              </Row>
              {t.note ? <Muted numberOfLines={3} style={{ marginTop: 6 }}>{t.note}</Muted> : null}
            </Press>
            <TradeShots tradeId={t.id} />
          </View>
        )
      })}
    </Card>
  )
}
