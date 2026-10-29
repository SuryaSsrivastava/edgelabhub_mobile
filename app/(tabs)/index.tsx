import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { ScrollView, Text, View } from "react-native"
import { api, type Account, type Forward } from "../../src/api"
import { useAuth } from "../../src/auth"
import { Bar, CountUp, Hero, Press, Pulse, Rise, RisingWords, Stat } from "../../src/fx"
import { ago, clock, dayLabel, money, until } from "../../src/format"
import { useLoad } from "../../src/hooks"
import { colors, impactColor, radius } from "../../src/theme"
import { Card, Empty, ErrorNote, Label, Loading, Muted, Row, Screen, tone } from "../../src/ui"

const signed = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`
const statusColor = (s: Account["status"]) => (s === "active" ? colors.green : s === "error" ? colors.red : colors.amber)
const chip = { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 4 } as const

/** A clock that ticks, so the countdown to the next release stays right while the screen is open. */
function useNow(ms = 30_000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()
  useNow()
  const accounts = useLoad(() => api.accounts(), { every: 60_000 })
  const next = useLoad(async () => {
    const r = await api.calendar("high", ["US"])
    return r.events.find((e) => +new Date(e.time) > Date.now()) ?? null
  }, { every: 60_000 })
  const forward = useLoad(() => api.forwardTests(), { every: 120_000 })
  const notices = useLoad(() => api.notices(3), { every: 60_000 })
  const invest = useLoad(() => api.investPortfolio(), { every: 300_000 })

  const list = accounts.data?.accounts ?? []
  const withMoney = list.filter((a) => a.prop)
  const today = list.reduce((sum, a) => sum + (a.prop?.today ?? 0), 0)
  const balance = withMoney.reduce((sum, a) => sum + (a.prop?.balance ?? 0), 0)
  const equity = withMoney.reduce((sum, a) => sum + (a.prop?.equity ?? 0), 0)
  const floating = equity - balance

  const running = (forward.data ?? []).filter((f) => f.status === "active")
  const totalR = running.reduce((sum, f) => sum + (f.stats?.totalR ?? 0), 0)
  const trades = running.reduce((sum, f) => sum + (f.stats?.n ?? 0), 0)
  const wins = running.reduce((sum, f) => sum + (f.stats?.wins ?? 0), 0)
  const winRate = trades > 0 ? (wins / trades) * 100 : null

  const refreshing = accounts.refreshing || next.refreshing || forward.refreshing || notices.refreshing
  const refresh = () => { void accounts.refresh(); void next.refresh(); void forward.refresh(); void notices.refresh() }
  const first = (user?.name || user?.email || "").split(/[ @]/)[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const unread = notices.data?.unread ?? 0
  const big = { fontSize: 19, fontWeight: "800" } as const

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Rise>
        <Hero>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ color: colors.green, fontSize: 11, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase" }}>EdgeLabHub{user?.plan ? ` · ${user.plan}` : ""}</Text>
              <RisingWords text={`${greeting}${first ? `, ${first}` : ""}`} delay={150} style={{ color: colors.text, fontSize: 27, fontWeight: "800", letterSpacing: -0.6, marginTop: 6 }} />
              <Muted style={{ marginTop: 2 }}>{new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</Muted>
            </View>
            <Press onPress={() => router.push("/settings")}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: `${colors.bg}99`, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="settings-outline" size={20} color={colors.text} />
              </View>
            </Press>
          </Row>

          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1.4, textTransform: "uppercase", marginTop: 16 }}>Today, all accounts</Text>
          {!accounts.loaded ? <Loading /> : (
            <CountUp value={today} format={(n) => money(n, "USD", true)} style={{ color: tone(today), fontSize: 40, fontWeight: "800", letterSpacing: -1.2, marginTop: 2 }} />
          )}
          <Muted>{list.length} account{list.length === 1 ? "" : "s"} · closed trades only</Muted>

          {accounts.loaded && withMoney.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              <Stat label="Balance"><CountUp value={balance} format={(n) => money(n)} style={[big, { color: colors.text }]} /></Stat>
              <Stat label="Equity"><CountUp value={equity} format={(n) => money(n)} style={[big, { color: colors.text }]} /></Stat>
              <Stat label="Floating"><CountUp value={floating} format={(n) => money(n, "USD", true)} style={[big, { color: tone(floating) }]} /></Stat>
              <Stat label="Forward R"><CountUp value={totalR} format={(n) => `${signed(n)}R`} style={[big, { color: tone(totalR) }]} /></Stat>
            </View>
          ) : null}
        </Hero>
      </Rise>

      {accounts.error ? <ErrorNote>{accounts.error}</ErrorNote> : null}

      {list.length > 0 ? (
        <Rise delay={200} style={{ marginTop: 14, marginBottom: 4 }}>
          <Label>Accounts</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {list.map((a) => (
              <Press key={a.id} onPress={() => router.push("/positions")} style={{ width: 188, backgroundColor: `${colors.card}d9`, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text numberOfLines={1} style={{ color: colors.text, fontSize: 14, fontWeight: "700", flex: 1, paddingRight: 6 }}>{a.name}</Text>
                  {a.status === "active" ? <Pulse color={statusColor(a.status)} size={6} /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor(a.status) }} />}
                </Row>
                <Muted style={{ marginTop: 1 }}>{[a.broker, a.is_prop ? "Prop" : a.kind].filter(Boolean).join(" · ")}</Muted>
                {a.prop ? (
                  <>
                    <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800", marginTop: 10, letterSpacing: -0.4 }}>{money(a.prop.equity)}</Text>
                    <Text style={{ color: tone(a.prop.today), fontSize: 12, fontWeight: "700", marginTop: 1 }}>{money(a.prop.today, "USD", true)} today</Text>
                  </>
                ) : <Muted style={{ marginTop: 14 }}>{a.status === "active" ? "Connected" : a.hint || a.status}</Muted>}
              </Press>
            ))}
          </ScrollView>
        </Rise>
      ) : null}

      <View style={{ height: 12 }} />

      {invest.data && invest.data.totals.count > 0 ? (
        <Card delay={240}>
          <Press onPress={() => router.push("/invest")}>
            <Row style={{ justifyContent: "space-between" }}>
              <Label>Investments</Label>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Row>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
              <CountUp value={invest.data.totals.value} format={(n) => money(n, "INR")} style={{ color: colors.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.6 }} />
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: tone(invest.data.totals.day_pnl), fontSize: 13, fontWeight: "800" }}>{money(invest.data.totals.day_pnl, "INR", true)} today</Text>
                <Muted>{invest.data.totals.count} holdings · {invest.data.totals.pnl >= 0 ? "+" : ""}{(invest.data.totals.pnl_pct ?? 0).toFixed(1)}% overall</Muted>
              </View>
            </Row>
          </Press>
        </Card>
      ) : null}

      <Card delay={280}>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>Next high-impact release</Label>
          <Pulse color={impactColor.high} size={5} />
        </Row>
        {!next.loaded ? <Loading /> : next.data ? (
          <Press onPress={() => router.push("/calendar")}>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>{next.data.name}</Text>
                <Muted style={{ marginTop: 4 }}>{next.data.currency} · {dayLabel(next.data.time)} {clock(next.data.time)}</Muted>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: colors.green, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 }}>{until(next.data.time)}</Text>
                <Muted>to go</Muted>
              </View>
            </Row>
            {next.data.forecast || next.data.previous ? (
              <Row style={{ gap: 8, marginTop: 10 }}>
                {next.data.forecast ? <View style={chip}><Text style={{ color: colors.muted, fontSize: 11 }}>Forecast <Text style={{ color: colors.text, fontWeight: "700" }}>{next.data.forecast}</Text></Text></View> : null}
                {next.data.previous ? <View style={chip}><Text style={{ color: colors.muted, fontSize: 11 }}>Previous <Text style={{ color: colors.text, fontWeight: "700" }}>{next.data.previous}</Text></Text></View> : null}
              </Row>
            ) : null}
          </Press>
        ) : <Muted>Nothing scheduled in the next few days.</Muted>}
      </Card>

      <Card delay={360}>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>Forward tests running</Label>
          {running.length > 0 ? <Muted>{running.length} live{winRate != null ? ` · ${winRate.toFixed(0)}% wins` : ""}</Muted> : null}
        </Row>
        {!forward.loaded ? <Loading /> : running.length === 0 ? <Muted>None running. Start one on the website.</Muted> : running.slice(0, 5).map((f, i) => <ForwardRow key={f.id} f={f} last={i === Math.min(running.length, 5) - 1} onPress={() => router.push(`/forward/${f.id}`)} />)}
      </Card>

      <Card delay={440}>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>Latest alerts</Label>
          {unread > 0 ? <Text style={{ color: colors.red, fontSize: 11, fontWeight: "700" }}>{unread} unread</Text> : null}
        </Row>
        {!notices.loaded ? <Loading /> : (notices.data?.items ?? []).length === 0 ? <Muted>Nothing yet. Alerts for your trades and releases land here.</Muted> : (notices.data?.items ?? []).map((n) => (
          <Press key={n.id} onPress={() => router.push("/alerts")} style={{ paddingVertical: 7 }}>
            <Row style={{ alignItems: "flex-start" }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, marginTop: 6, marginRight: 10, backgroundColor: n.read ? colors.border : colors.green }} />
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13.5, fontWeight: n.read ? "500" : "700" }}>{n.title}</Text>
                {n.body ? <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>{n.body}</Text> : null}
              </View>
              <Muted>{ago(n.created_at)}</Muted>
            </Row>
          </Press>
        ))}
      </Card>

      {accounts.loaded && list.length === 0 ? <Empty title="No accounts yet" text="Connect a MetaTrader account on the website to see your trades here." /> : null}
    </Screen>
  )
}

function ForwardRow({ f, last, onPress }: { f: Forward; last: boolean; onPress: () => void }) {
  const st = f.stats
  const win = st && st.n > 0 ? st.winRate * 100 : null
  return (
    <Press onPress={onPress} style={{ paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: `${colors.border}99` }}>
      <Row style={{ justifyContent: "space-between" }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>{f.name.split(" · ")[0]}</Text>
          <Muted>{f.symbol} · {f.timeframe} · {st?.n ?? 0} trade{st?.n === 1 ? "" : "s"}{st?.profitFactor ? ` · PF ${st.profitFactor.toFixed(2)}` : ""}</Muted>
        </View>
        <Text style={{ color: tone(st?.totalR), fontWeight: "800", fontSize: 15 }}>{st ? `${signed(st.totalR)}R` : "-"}</Text>
      </Row>
      {win != null ? (
        <Row style={{ marginTop: 7, gap: 8 }}>
          <View style={{ flex: 1 }}><Bar pct={win} color={win >= 50 ? colors.green : colors.amber} /></View>
          <Text style={{ color: colors.muted, fontSize: 11, width: 62, textAlign: "right" }}>{win.toFixed(0)}% wins</Text>
        </Row>
      ) : null}
    </Press>
  )
}
