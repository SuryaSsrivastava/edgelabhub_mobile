import { Ionicons } from "@expo/vector-icons"
import { useEffect, useRef, useState } from "react"
import { Animated, Easing, Text, View } from "react-native"
import Svg, { Circle } from "react-native-svg"
import type { Meter } from "./api"
import { Bar, Pulse, Rise, useReducedMotion } from "./fx"
import { colors } from "./theme"

/** A clock that ticks every `ms`. */
export function useNow(ms: number) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}

const hm = (mins: number) => { const m = Math.max(0, Math.round(mins)); return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m` }

// ---- market sessions ------------------------------------------------------------------------------------------------------------------------------------------------------

// Forex sessions in UTC hours (they shift an hour with daylight saving, so these are the usual figures)
const SESSIONS = [
  { name: "Sydney", from: 21, to: 6, color: "#a78bfa" },
  { name: "Tokyo", from: 0, to: 9, color: "#f472b6" },
  { name: "London", from: 7, to: 16, color: colors.blue },
  { name: "New York", from: 12, to: 21, color: colors.green },
]
const isOpen = (s: { from: number; to: number }, h: number) => (s.from < s.to ? h >= s.from && h < s.to : h >= s.from || h < s.to)

/** The four forex sessions across 24 hours (UTC), with a marker for now that glides into place and the sessions that are open lit up. */
export function SessionClock() {
  const reduced = useReducedMotion()
  const now = useNow(20_000)
  const d = new Date(now)
  const h = d.getUTCHours() + d.getUTCMinutes() / 60
  const [w, setW] = useState(0)
  const at = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!w) return
    if (reduced) { at.setValue(h / 24); return }
    Animated.timing(at, { toValue: h / 24, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [h, w, reduced, at])

  const open = SESSIONS.filter((s) => isOpen(s, h))
  // the next time any session opens or closes
  let nextChange: { mins: number; text: string } | null = null
  for (const s of SESSIONS) {
    for (const [edge, verb] of [[s.from, "opens"], [s.to, "closes"]] as const) {
      const wasOpen = isOpen(s, h)
      if ((verb === "closes") !== wasOpen) continue
      const mins = ((edge - h + 24) % 24) * 60
      if (!nextChange || mins < nextChange.mins) nextChange = { mins, text: `${s.name} ${verb} in ${hm(mins)}` }
    }
  }
  const segments = (s: { from: number; to: number }) => (s.from < s.to ? [[s.from, s.to]] : [[s.from, 24], [0, s.to]])

  return (
    <View>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>{open.length ? `${open.map((s) => s.name).join(" · ")} open` : "Markets are between sessions"}</Text>
      {nextChange ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{nextChange.text}</Text> : null}
      <View style={{ marginTop: 12 }}>
        {SESSIONS.map((s, i) => {
          const on = isOpen(s, h)
          return (
            <Rise key={s.name} delay={i * 80}>
              <View style={{ flexDirection: "row", alignItems: "center", height: 22 }}>
                <Text style={{ width: 64, color: on ? colors.text : colors.muted, fontSize: 11.5, fontWeight: on ? "800" : "600" }}>{s.name}</Text>
                <View style={{ flex: 1, height: 8 }} onLayout={i === 0 ? (e) => setW(e.nativeEvent.layout.width) : undefined}>
                  <View style={{ position: "absolute", left: 0, right: 0, top: 2, height: 4, borderRadius: 2, backgroundColor: `${colors.muted}1f` }} />
                  {segments(s).map(([a, b], k) => (
                    <View key={k} style={{ position: "absolute", left: `${(a / 24) * 100}%`, width: `${((b - a) / 24) * 100}%`, top: 1, height: 6, borderRadius: 3, backgroundColor: s.color, opacity: on ? 1 : 0.28, shadowColor: s.color, shadowOpacity: on ? 0.9 : 0, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: on ? 3 : 0 }} />
                  ))}
                </View>
              </View>
            </Rise>
          )
        })}
        {w > 0 ? (
          <View pointerEvents="none" style={{ position: "absolute", left: 64, right: 0, top: -4, bottom: 0 }}>
            <Animated.View style={{ position: "absolute", top: 0, bottom: 14, width: 2, marginLeft: -1, backgroundColor: colors.text, opacity: 0.85, transform: [{ translateX: at.interpolate({ inputRange: [0, 1], outputRange: [0, w] }) }] }}>
              <View style={{ position: "absolute", top: -3, left: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text }} />
            </Animated.View>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", marginLeft: 64, marginTop: 2 }}>
          {["00", "06", "12", "18", "24"].map((t, i) => <Text key={t} style={{ flex: i === 4 ? 0 : 1, color: colors.muted, fontSize: 9.5, fontWeight: "600" }}>{t}</Text>)}
        </View>
      </View>
      <Text style={{ color: colors.muted, fontSize: 10.5, marginTop: 4 }}>Times are UTC and shift an hour with daylight saving.</Text>
    </View>
  )
}

// ---- countdown --------------------------------------------------------------------------------------------------------------------------------------------------------------

/** A ring that empties as a release gets close, with the time to go ticking every second in the middle. A full ring means six hours or more. */
export function CountdownRing({ time, size = 96 }: { time: string; size?: number }) {
  const reduced = useReducedMotion()
  const now = useNow(1000)
  const left = Math.max(0, +new Date(time) - now)
  const WINDOW = 6 * 3600_000
  const frac = Math.min(1, left / WINDOW)
  const sweep = useRef(new Animated.Value(reduced ? 1 : 0)).current
  const [g, setG] = useState(reduced ? 1 : 0)
  useEffect(() => {
    if (reduced) return
    const id = sweep.addListener(({ value }) => setG(value))
    Animated.timing(sweep, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
    return () => sweep.removeListener(id)
  }, [reduced, sweep])
  const stroke = 8, r = (size - stroke) / 2, c = 2 * Math.PI * r
  const color = left < 300_000 ? colors.red : left < 1_800_000 ? colors.amber : colors.green
  const s = Math.floor(left / 1000), days = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60
  const p2 = (n: number) => String(n).padStart(2, "0")
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={`${colors.muted}22`} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={[c * frac * g, c]} rotation={-90} origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      <Text style={{ color: colors.text, fontSize: days > 0 ? 15 : 17, fontWeight: "800", letterSpacing: -0.3, fontVariant: ["tabular-nums"] }}>{days > 0 ? `${days}d ${p2(hh)}h` : hh > 0 ? `${hh}:${p2(mm)}:${p2(ss)}` : `${p2(mm)}:${p2(ss)}`}</Text>
      <Text style={{ color: colors.muted, fontSize: 9.5, fontWeight: "700", letterSpacing: 1, marginTop: 1 }}>{days > 0 ? "TO GO" : hh > 0 ? "H:M:S" : "M:S"}</Text>
    </View>
  )
}

// ---- guard rails ------------------------------------------------------------------------------------------------------------------------------------------------------------

const STATE = {
  ok: { color: colors.green, word: "On track" },
  warn: { color: colors.amber, word: "Close to the limit" },
  breached: { color: colors.red, word: "Limit reached" },
  achieved: { color: colors.blue, word: "Goal reached" },
} as const

/** The member's own limits and goals (set on the website) as meters that fill up, going amber near a limit and red past it. */
export function GuardRails({ meters }: { meters: (Meter & { scope?: string })[] }) {
  return (
    <View style={{ gap: 14 }}>
      {meters.map((m, i) => {
        const st = STATE[m.state]
        const pct = m.limit > 0 ? Math.min(100, (m.value / m.limit) * 100) : 0
        return (
          <Rise key={`${m.scope ?? ""}${m.key}`} delay={i * 90}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 }}>
                <Ionicons name={m.kind === "goal" ? "trophy-outline" : "shield-checkmark-outline"} size={16} color={st.color} />
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: "700", marginLeft: 8, flexShrink: 1 }}>{m.scope ? `${m.scope}: ` : ""}{m.label}</Text>
                {m.state === "breached" ? <View style={{ marginLeft: 4 }}><Pulse color={colors.red} size={5} /></View> : null}
              </View>
              <Text style={{ color: st.color, fontSize: 11, fontWeight: "800" }}>{st.word}</Text>
            </View>
            <Bar pct={pct} color={st.color} height={7} />
            <Text style={{ color: colors.muted, fontSize: 11.5, marginTop: 4 }}>{m.text}</Text>
          </Rise>
        )
      })}
    </View>
  )
}

// ---- ticker -----------------------------------------------------------------------------------------------------------------------------------------------------------------

/** One entry on the tape: a market, a symbol, its last price and its change today. */
export type TickerItem = { key: string; symbol: string; market: string; price: number | null; chg: number | null; mine?: boolean }

const cur = (m: string) => (m === "nse" ? "₹" : m === "forex" ? "" : "$")
const fmt = (n: number, m: string) => `${cur(m)}${m === "forex" ? n.toFixed(4) : n.toLocaleString(undefined, { maximumFractionDigits: n >= 100 ? 0 : 2 })}`

function TickerItems({ items }: { items: TickerItem[] }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {items.map((s) => (
        <View key={s.key} style={{ flexDirection: "row", alignItems: "center", marginRight: 26 }}>
          {s.mine ? <Ionicons name="star" size={11} color={colors.amber} style={{ marginRight: 4 }} /> : null}
          <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: "800" }}>{s.symbol}</Text>
          <Text style={{ color: colors.muted, fontSize: 12.5, fontWeight: "600", marginLeft: 6 }}>{s.price != null ? fmt(s.price, s.market) : "-"}</Text>
          {s.chg != null ? <Text style={{ color: s.chg >= 0 ? colors.green : colors.red, fontSize: 12, fontWeight: "800", marginLeft: 6 }}>{s.chg >= 0 ? "▲" : "▼"} {Math.abs(s.chg).toFixed(2)}%</Text> : null}
        </View>
      ))}
    </View>
  )
}

/** Prices as a tape that scrolls by, like a stock ticker. */
export function Ticker({ items }: { items: TickerItem[] }) {
  const reduced = useReducedMotion()
  const x = useRef(new Animated.Value(0)).current
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!w || reduced) return
    x.setValue(0)
    const loop = Animated.loop(Animated.timing(x, { toValue: -w, duration: (w / 38) * 1000, easing: Easing.linear, useNativeDriver: true }))
    loop.start()
    return () => loop.stop()
  }, [w, reduced, x])
  if (items.length === 0) return null
  return (
    <View style={{ height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: `${colors.card}cc`, overflow: "hidden", justifyContent: "center", marginBottom: 12 }}>
      <Animated.View style={{ flexDirection: "row", transform: [{ translateX: x }] }}>
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ paddingLeft: 16 }}><TickerItems items={items} /></View>
        {!reduced ? <View style={{ paddingLeft: 16 }}><TickerItems items={items} /></View> : null}
      </Animated.View>
    </View>
  )
}
