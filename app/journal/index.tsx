import { useRouter } from "expo-router"
import { Pressable, Text, View } from "react-native"
import { api, type JournalTrade } from "../../src/api"
import { Hero, Rise, Stat } from "../../src/fx"
import { dayLabel, money } from "../../src/format"
import { useLoad } from "../../src/hooks"
import { journalStats, pnlOf, rOf } from "../../src/journal"
import { colors } from "../../src/theme"
import { Button, Card, Empty, ErrorNote, Loading, Muted, Row, Screen, tone } from "../../src/ui"

const sgn = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`

export default function Journal() {
  const router = useRouter()
  const trades = useLoad(() => api.journalTrades())
  const list = trades.data ?? []
  const st = journalStats(list)

  return (
    <Screen refreshing={trades.refreshing} onRefresh={trades.refresh} padTop={false}>
      <Rise>
        <Hero tint={colors.green}>
          <Text style={{ color: colors.green, fontSize: 11, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase" }}>Journal</Text>
          <Text style={{ color: tone(st.net), fontSize: 34, fontWeight: "800", letterSpacing: -1, marginTop: 8 }}>{trades.loaded ? money(st.net, "USD", true) : "-"}</Text>
          <Muted>{st.count} trade{st.count === 1 ? "" : "s"} logged</Muted>
          {st.count > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              <Stat label="Win rate">{st.winRate.toFixed(0)}%</Stat>
              <Stat label="Avg R" tint={tone(st.avgR)}>{sgn(st.avgR)}R</Stat>
              <Stat label="Profit factor">{st.profitFactor === Infinity ? "∞" : st.profitFactor.toFixed(2)}</Stat>
              <Stat label="Today" tint={tone(st.today)}>{money(st.today, "USD", true)}</Stat>
            </View>
          ) : null}
        </Hero>
      </Rise>
      <View style={{ marginTop: 12 }}><Button onPress={() => router.push("/journal/new")}>Log a trade</Button></View>
      {trades.error ? <View style={{ marginTop: 12 }}><ErrorNote>{trades.error}</ErrorNote></View> : null}
      <View style={{ marginTop: 12 }}>
        {!trades.loaded ? <Loading /> : list.length === 0 ? <Empty title="No trades yet" text="Log a trade here or connect an account on the website. Your journal is the same on both." /> : list.map((t, i) => <TradeCard key={t.id} t={t} delay={Math.min(i, 8) * 40} onPress={() => router.push(`/journal/${t.id}`)} />)}
      </View>
    </Screen>
  )
}

function TradeCard({ t, delay, onPress }: { t: JournalTrade; delay: number; onPress: () => void }) {
  const p = pnlOf(t)
  return (
    <Pressable onPress={onPress}>
      <Card delay={delay}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}><Text style={{ color: t.side === "Short" ? colors.red : colors.green }}>{t.side.toUpperCase()}</Text> {t.symbol}</Text>
            <Muted>{dayLabel(t.opened_at)}{t.setup ? ` · ${t.setup}` : ""}</Muted>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: tone(p), fontSize: 16, fontWeight: "800" }}>{money(p, "USD", true)}</Text>
            <Text style={{ color: tone(p), fontSize: 12, fontWeight: "700" }}>{sgn(rOf(t))}R</Text>
          </View>
        </Row>
        {t.note ? <Muted numberOfLines={2} style={{ marginTop: 8 }}>{t.note}</Muted> : null}
        {t.emotions.length + t.tags.length > 0 ? <Muted style={{ marginTop: 6 }}>{[...t.emotions, ...t.tags.map((x) => `#${x}`)].join(" · ")}</Muted> : null}
      </Card>
    </Pressable>
  )
}
