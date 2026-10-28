import { Ionicons } from "@expo/vector-icons"
import * as Notifications from "expo-notifications"
import { Tabs } from "expo-router"
import { useEffect, useState } from "react"
import { AppState } from "react-native"
import { api } from "../../src/api"
import { registerForPush } from "../../src/push"
import { colors } from "../../src/theme"

type IconName = React.ComponentProps<typeof Ionicons>["name"]
const icon = (name: IconName, focused: IconName) => ({ color, focused: f, size }: { color: string; focused: boolean; size: number }) => <Ionicons name={f ? focused : name} size={size} color={color} />

export default function TabsLayout() {
  const [unread, setUnread] = useState(0)

  // the number on the Alerts tab: now, every minute while the app is open, and whenever a notification arrives
  useEffect(() => {
    let alive = true
    const look = () => { api.notices(1).then((r) => alive && setUnread(r.unread)).catch(() => {}) }
    look()
    const t = setInterval(() => { if (AppState.currentState === "active") look() }, 60_000)
    const sub = Notifications.addNotificationReceivedListener(look)
    const app = AppState.addEventListener("change", (s) => { if (s === "active") look() })
    return () => { alive = false; clearInterval(t); sub.remove(); app.remove() }
  }, [])

  // turn push on for this phone unless the member switched it off in Settings
  useEffect(() => {
    api.prefs().then((p) => { if (p.push !== false) void registerForPush() }).catch(() => {})
  }, [])

  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: colors.muted,
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border }, tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
    }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home-outline", "home") }} />
      <Tabs.Screen name="positions" options={{ title: "Positions", tabBarIcon: icon("pulse-outline", "pulse") }} />
      <Tabs.Screen name="alerts" options={{ title: "Alerts", tabBarIcon: icon("notifications-outline", "notifications"), tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined, tabBarBadgeStyle: { backgroundColor: colors.red, color: "#fff", fontSize: 10 } }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar", tabBarIcon: icon("calendar-outline", "calendar") }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: icon("ellipsis-horizontal-circle-outline", "ellipsis-horizontal-circle") }} />
    </Tabs>
  )
}
