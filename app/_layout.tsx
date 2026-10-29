import * as Notifications from "expo-notifications"
import { Stack, useRouter, useSegments } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { api } from "../src/api"
import { AuthProvider, useAuth } from "../src/auth"
import { onLiveNotificationPress } from "../src/liveservice"
import { routeFor } from "../src/push"
import { ScopeProvider } from "../src/scope"
import { colors } from "../src/theme"

SplashScreen.preventAutoHideAsync().catch(() => {})

function Gate() {
  const { user, ready } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!ready) return
    SplashScreen.hideAsync().catch(() => {})
    const onLogin = segments[0] === "login"
    if (!user && !onLogin) router.replace("/login")
    else if (user && onLogin) router.replace("/")
  }, [ready, user, segments, router])

  // Tapping a push notification opens the screen it is about (also when the app was closed).
  useEffect(() => {
    if (!user) return
    const open = (r: Notifications.NotificationResponse | null) => {
      const data = r?.notification.request.content.data as { link?: string; id?: number } | undefined
      if (!r) return
      if (data?.id) api.readNotice(Number(data.id)).catch(() => {}) // opening a notification counts as reading it (and as an open for a broadcast)
      router.push(routeFor(data?.link) as never)
    }
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {})
    const sub = Notifications.addNotificationResponseReceivedListener(open)
    return () => sub.remove()
  }, [user, router])

  // tapping the live-trades notification in the bar opens the Live trades screen
  useEffect(() => {
    if (!user) return
    return onLiveNotificationPress(() => router.push("/positions"))
  }, [user, router])

  if (!ready) return null
  return (
    <Stack screenOptions={{ animation: "slide_from_right", headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="forward/[id]" options={{ title: "Forward test" }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="alerts" options={{ title: "Alerts" }} />
      <Stack.Screen name="positions" options={{ title: "Live trades" }} />
      <Stack.Screen name="calendar" options={{ title: "Calendar" }} />
      <Stack.Screen name="trade/new" options={{ title: "Log a trade", presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="trade/[id]" options={{ title: "Trade" }} />
      <Stack.Screen name="asset/[market]/[symbol]" options={{ title: "" }} />
      <Stack.Screen name="strategies" options={{ title: "Strategies" }} />
      <Stack.Screen name="strategy/[id]" options={{ title: "Strategy" }} />
    </Stack>
  )
}

export default function Root() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <ScopeProvider><Gate /></ScopeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
