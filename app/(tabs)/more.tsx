import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { Alert, Pressable, Text, View } from "react-native"
import { api } from "../../src/api"
import { useAuth } from "../../src/auth"
import { ago } from "../../src/format"
import { useLoad } from "../../src/hooks"
import { colors } from "../../src/theme"
import { Button, Card, Empty, ErrorNote, Label, Loading, Muted, Row, Screen, Title, tone } from "../../src/ui"

type IconName = React.ComponentProps<typeof Ionicons>["name"]
const MENU: [IconName, string, string, string][] = [
  ["pulse-outline", "Live trades", "/positions", "Open trades on your accounts, with close"],
  ["notifications-outline", "Alerts", "/alerts", "Trades, releases and rule warnings"],
  ["flag-outline", "Goals and limits", "/goals", "Daily limits, profit goals and your checklist"],
  ["library-outline", "Strategies", "/strategies", "Saved strategies and backtest results"],
  ["settings-outline", "Settings", "/settings", "Notifications, server and sign out"],
]

export default function More() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const tests = useLoad(() => api.forwardTests(), { every: 120_000 })
  const list = tests.data ?? []

  return (
    <Screen refreshing={tests.refreshing} onRefresh={tests.refresh}>
      <Title brand sub="Profile, tools and settings">More</Title>
      <Pressable onPress={() => router.push("/profile")}>
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <Row style={{ flex: 1 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: `${colors.green}22`, borderWidth: 1.5, borderColor: colors.green, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: colors.green, fontSize: 18, fontWeight: "800" }}>{(user?.name || user?.email || "?").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")}</Text>
              </View>
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>{user?.name || "Your profile"}</Text>
                <Muted numberOfLines={1}>{user?.email}</Muted>
                <Row style={{ marginTop: 5 }}><View style={{ backgroundColor: `${colors.green}22`, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 }}><Text style={{ color: colors.green, fontSize: 10.5, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 }}>{user?.plan ?? "starter"} plan</Text></View></Row>
              </View>
            </Row>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Row>
        </Card>
      </Pressable>

      <Card style={{ paddingVertical: 4 }}>
        {MENU.map(([icon, label, route, hint], i) => (
          <Pressable key={route} onPress={() => router.push(route as never)} style={{ paddingVertical: 13, borderBottomWidth: i === MENU.length - 1 ? 0 : 1, borderBottomColor: `${colors.border}99` }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Row style={{ flex: 1 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `${colors.green}1a`, alignItems: "center", justifyContent: "center" }}><Ionicons name={icon} size={18} color={colors.green} /></View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>{label}</Text>
                  <Muted>{hint}</Muted>
                </View>
              </Row>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Row>
          </Pressable>
        ))}
      </Card>

      <Label>Forward tests</Label>
      {tests.error ? <ErrorNote>{tests.error}</ErrorNote> : null}
      {!tests.loaded ? <Loading /> : list.length === 0 ? <Empty title="No forward tests" text="Freeze a strategy on the website and judge it on the market that comes next." /> : list.map((f) => (
        <Pressable key={f.id} onPress={() => router.push(`/forward/${f.id}`)}>
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>{f.name.split(" · ")[0]}</Text>
                <Muted style={{ marginTop: 3 }}>{f.symbol} · {f.timeframe} · {f.status === "active" ? "running" : "stopped"}{f.evaluated_at ? ` · checked ${ago(f.evaluated_at)}` : ""}</Muted>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: tone(f.stats?.totalR), fontSize: 16, fontWeight: "800" }}>{f.stats ? `${f.stats.totalR >= 0 ? "+" : ""}${f.stats.totalR.toFixed(2)}R` : "-"}</Text>
                <Muted>{f.stats?.n ?? 0}{f.max_trades ? `/${f.max_trades}` : ""} trades</Muted>
              </View>
            </Row>
          </Card>
        </Pressable>
      ))}
      <View style={{ marginTop: 18 }}>
        <Button tone="danger" onPress={() => Alert.alert("Sign out?", "You will stop receiving alerts on this phone.", [
          { text: "Cancel", style: "cancel" },
          { text: "Sign out", style: "destructive", onPress: () => void signOut() },
        ])}>Sign out</Button>
      </View>
    </Screen>
  )
}
