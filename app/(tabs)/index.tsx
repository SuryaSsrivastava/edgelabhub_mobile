import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useState } from "react"
import { Text, View } from "react-native"
import { api } from "../../src/api"
import { useAuth } from "../../src/auth"
import { Curve, PnlCalendar } from "../../src/charts"
import { CountUp, Press, Pulse, Rise, Stat } from "../../src/fx"
import { clock, dayLabel, money, until } from "../../src/format"
import { useLoad } from "../../src/hooks"
import { LiveTrades } from "../../src/live"
import { chosenAccounts, inScope, ScopeBar, useScope } from "../../src/scope"
import { DayTrades } from "../../src/day"
import { equityPoints, journalStats, pnlByDay } from "../../src/journal"
import { colors, impactColor, radius } from "../../src/theme"
import { Brand, Card, Label, Loading, Muted, Row, Screen, tone } from "../../src/ui"

type IconName = React.ComponentProps<typeof Ionicons>["name"]
const sgn = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()
  const [day, setDay] = useState<Date | null>(null)
  const accounts = useLoad(() => api.accounts(), { every: 60_000 })
  const trades = useLoad(() => api.journalTrades(500), { every: 120_000 })
  const counts = useLoad(() => api.journalShotCounts(), { every: 300_000 })
  const notices = useLoad(() => api.notices(1), { every: 60_000 })
  const next = useLoad(async () => (await api.calendar("high", ["US"])).events.find((e) => +new Date(e.time) > Date.now()) ?? null, { every: 60_000 })

  const list = accounts.data?.accounts ?? []
  const { mode, filter } = useScope()
  const every = trades.data ?? []
  const all = every.filter((t) => inScope(t, mode, filter))  // everything below follows the chosen accounts
  const st = journalStats(all)
  const picked = mode !== "real" || filter.length > 0
  const today = picked ? st.today : list.reduce((sum, a) => sum + (a.prop?.today ?? 0), 0) || st.today
  const first = (user?.name || user?.email || "").split(/[ @]/)[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const unread = notices.data?.unread ?? 0
  const refresh = () => { void accounts.refresh(); void trades.refresh(); void notices.refresh(); void next.refresh(); void counts.refresh() }

  return (
    <Screen refreshing={accounts.refreshing || trades.refreshing} onRefresh={refresh}>
      <Row style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <Brand size={38} />
        <Press onPress={() => router.push("/alerts")}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
            {unread > 0 ? <View style={{ position: "absolute", top: 7, right: 7, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.red, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}><Text style={{ color: "#fff", fontSize: 9.5, fontWeight: "800" }}>{unread > 9 ? "9+" : unread}</Text></View> : null}
          </View>
        </Press>
      </Row>

      <View style={{ marginBottom: 14 }}>
        <Muted>{greeting}</Muted>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.6 }}>{first || "Trader"}</Text>
      </View>

      <ScopeBar trades={every} accounts={list} />

      <Card>
        <Muted>{picked ? "Today · selected accounts" : "Today"}</Muted>
        {!accounts.loaded && !trades.loaded ? <Loading /> : <CountUp value={today} format={(n) => money(n, "USD", true)} style={{ color: tone(today), fontSize: 38, fontWeight: "800", letterSpacing: -1.2 }} />}
        <View style={{ marginTop: 10 }}>{all.length > 1 ? <Curve points={equityPoints(all)} height={100} /> : <Muted>Your equity curve appears after your first trades.</Muted>}</View>
        {all.length > 0 ? <Row style={{ justifyContent: "space-between", marginTop: 6 }}><Muted>All time</Muted><Text style={{ color: tone(st.net), fontSize: 13, fontWeight: "800" }}>{money(st.net, "USD", true)}</Text></Row> : null}
      </Card>

      <LiveTrades accounts={chosenAccounts(list, mode, filter)} />

      <Rise delay={120}>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <Stat min="28%" label="Win rate">{all.length ? `${st.winRate.toFixed(0)}%` : "-"}</Stat>
          <Stat min="28%" label="Avg R" tint={tone(st.avgR)}>{all.length ? `${sgn(st.avgR)}R` : "-"}</Stat>
          <Stat min="28%" label="Trades">{String(st.count)}</Stat>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
          <Quick icon="add-circle-outline" label="Log trade" onPress={() => router.push("/trade/new")} />
          <Quick icon="pulse-outline" label="Live trades" onPress={() => router.push("/positions")} />
          <Quick icon="search-outline" label="Markets" onPress={() => router.push("/markets")} />
          <Quick icon="calendar-outline" label="Calendar" onPress={() => router.push("/calendar")} />
        </View>
      </Rise>

      {every.length > 0 && all.length === 0 ? <Card><Muted style={{ textAlign: "center" }}>No trades for this selection. Pick another account above.</Muted></Card> : null}

      {all.length > 0 ? (
        <>
          <Card delay={200}>
            <PnlCalendar byDay={pnlByDay(all)} onPick={(d) => setDay(d)} />
            {!day ? <Muted style={{ textAlign: "center", marginTop: 10 }}>Tap a day to see its trades and screenshots.</Muted> : null}
          </Card>
          {day ? <DayTrades day={day} trades={all} counts={counts.data ?? {}} onOpen={(id) => router.push(`/trade/${id}`)} /> : null}
        </>
      ) : null}

      <View style={{ height: 12 }} />
      {next.data ? (
        <Card delay={320}>
          <Press onPress={() => router.push("/calendar")}>
            <Row style={{ justifyContent: "space-between" }}>
              <Label>Next high-impact release</Label>
              <Pulse color={impactColor.high} size={5} />
            </Row>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>{next.data.name}</Text>
                <Muted style={{ marginTop: 3 }}>{next.data.currency} · {dayLabel(next.data.time)} {clock(next.data.time)}</Muted>
              </View>
              <Text style={{ color: colors.green, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 }}>{until(next.data.time)}</Text>
            </Row>
          </Press>
        </Card>
      ) : null}
    </Screen>
  )
}

function Quick({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Press onPress={onPress}>
        <View style={{ alignItems: "center", paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name={icon} size={22} color={colors.green} />
          <Text style={{ color: colors.text, fontSize: 11, fontWeight: "700", marginTop: 5 }}>{label}</Text>
        </View>
      </Press>
    </View>
  )
}
