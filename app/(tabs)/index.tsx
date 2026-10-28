import { useRouter } from "expo-router"
import { Pressable, Text, View } from "react-native"
import { api } from "../../src/api"
import { useAuth } from "../../src/auth"
import { clock, dayLabel, money, until } from "../../src/format"
import { useLoad } from "../../src/hooks"
import { colors, impactColor } from "../../src/theme"
import { Card, Empty, ErrorNote, Label, Loading, Muted, Row, Screen, Title, tone } from "../../src/ui"

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()
  const accounts = useLoad(() => api.accounts(), { every: 60_000 })
  const next = useLoad(async () => {
    const r = await api.calendar("high", ["US"])
    return r.events.find((e) => +new Date(e.time) > Date.now()) ?? null
  }, { every: 60_000 })
  const forward = useLoad(() => api.forwardTests(), { every: 120_000 })

  const list = accounts.data?.accounts ?? []
  const today = list.reduce((sum, a) => sum + (a.prop?.today ?? 0), 0)
  const running = (forward.data ?? []).filter((f) => f.status === "active")
  const refreshing = accounts.refreshing || next.refreshing || forward.refreshing
  const refresh = () => { void accounts.refresh(); void next.refresh(); void forward.refresh() }
  const first = (user?.name || user?.email || "").split(/[ @]/)[0]

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Title sub={new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}>{`Hi${first ? `, ${first}` : ""}`}</Title>
      {accounts.error ? <ErrorNote>{accounts.error}</ErrorNote> : null}

      <Card>
        <Label>Today, all accounts</Label>
        {!accounts.loaded ? <Loading /> : (
          <Text style={{ color: tone(today), fontSize: 34, fontWeight: "800", letterSpacing: -0.8 }}>{money(today, "USD", true)}</Text>
        )}
        <Muted>{list.length} account{list.length === 1 ? "" : "s"} · closed trades only</Muted>
      </Card>

      <Card>
        <Label>Next high-impact release</Label>
        {!next.loaded ? <Loading /> : next.data ? (
          <Pressable onPress={() => router.push("/calendar")}>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Row><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: impactColor.high, marginRight: 8 }} /><Text style={{ color: colors.text, fontSize: 16, fontWeight: "700", flexShrink: 1 }}>{next.data.name}</Text></Row>
                <Muted style={{ marginTop: 4 }}>{next.data.currency} · {dayLabel(next.data.time)} {clock(next.data.time)}</Muted>
              </View>
              <Text style={{ color: colors.green, fontSize: 20, fontWeight: "800" }}>{until(next.data.time)}</Text>
            </Row>
          </Pressable>
        ) : <Muted>Nothing scheduled in the next few days.</Muted>}
      </Card>

      <Card>
        <Label>Forward tests running</Label>
        {!forward.loaded ? <Loading /> : running.length === 0 ? <Muted>None running. Start one on the website.</Muted> : running.slice(0, 4).map((f) => (
          <Pressable key={f.id} onPress={() => router.push(`/forward/${f.id}`)} style={{ paddingVertical: 8 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>{f.name.split(" · ")[0]}</Text>
                <Muted>{f.symbol} · {f.timeframe} · {f.stats?.n ?? 0} trades</Muted>
              </View>
              <Text style={{ color: tone(f.stats?.totalR), fontWeight: "700" }}>{f.stats ? `${f.stats.totalR >= 0 ? "+" : ""}${f.stats.totalR.toFixed(2)}R` : "-"}</Text>
            </Row>
          </Pressable>
        ))}
      </Card>

      {accounts.loaded && list.length === 0 ? <Empty title="No accounts yet" text="Connect a MetaTrader account on the website to see your trades here." /> : null}
    </Screen>
  )
}
