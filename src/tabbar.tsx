import { LinearGradient } from "expo-linear-gradient"
import type { Tabs } from "expo-router"
import { useEffect, useRef, useState, type ComponentProps } from "react"
import { Animated, Platform, Pressable, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { tick } from "./fx"
import { colors } from "./theme"

type BarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0]

/** The bottom bar: a pill of light slides under the open tab, the icon springs up, and every tap ticks. */
export function TabBar({ state, descriptors, navigateToTab }: BarProps) {
  const insets = useSafeAreaInsets()
  const [w, setW] = useState(0)
  const x = useRef(new Animated.Value(0)).current
  const n = state.routes.length
  const slot = w / n

  useEffect(() => {
    if (!w) return
    Animated.spring(x, { toValue: state.index * slot, useNativeDriver: true, speed: 14, bounciness: 9 }).start()
  }, [state.index, slot, w, x])

  return (
    <View style={{ backgroundColor: `${colors.bg}f2`, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 8 : 0) }}>
      <LinearGradient colors={[`${colors.green}55`, "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1 }} />
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: "row", paddingTop: 6 }}>
        {w > 0 ? (
          <Animated.View pointerEvents="none" style={{ position: "absolute", top: 6, left: 0, width: slot, height: 50, alignItems: "center", transform: [{ translateX: x }] }}>
            <View style={{ width: slot - 18, height: 48, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: `${colors.green}44` }}>
              <LinearGradient colors={[`${colors.green}30`, `${colors.green}08`]} style={{ flex: 1 }} />
            </View>
          </Animated.View>
        ) : null}
        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key]
          const focused = state.index === i
          const color = focused ? colors.green : colors.muted
          const badge = options.tabBarBadge
          return (
            <Tab key={route.key} focused={focused} onPress={() => {
              tick()
              navigateToTab(route.key)
            }}>
              <View>
                {options.tabBarIcon?.({ focused, color, size: 22 })}
                {badge ? <View style={{ position: "absolute", top: -4, right: -10, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.red, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}><Text style={{ color: "#fff", fontSize: 9.5, fontWeight: "800" }}>{badge}</Text></View> : null}
              </View>
              <Text style={{ color, fontSize: 10.5, fontWeight: focused ? "800" : "600", marginTop: 3 }}>{String(options.title ?? route.name)}</Text>
            </Tab>
          )
        })}
      </View>
    </View>
  )
}

function Tab({ focused, onPress, children }: { focused: boolean; onPress: () => void; children: React.ReactNode }) {
  const lift = useRef(new Animated.Value(focused ? 1 : 0)).current
  useEffect(() => { Animated.spring(lift, { toValue: focused ? 1 : 0, useNativeDriver: true, speed: 16, bounciness: 14 }).start() }, [focused, lift])
  return (
    <Pressable onPress={onPress} style={{ flex: 1, height: 50, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ alignItems: "center", transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }, { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>{children}</Animated.View>
    </Pressable>
  )
}
