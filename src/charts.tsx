import { useEffect, useMemo, useRef, useState } from "react"
import { Animated, Easing, Pressable, Text, View } from "react-native"
import Svg, { Defs, Line, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg"
import { Sparkline, tick, useReducedMotion } from "./fx"
import { money } from "./format"
import { colors, radius } from "./theme"

/** A line that fills the width of whatever holds it. */
export function Curve({ points, height = 90, color }: { points: number[]; height?: number; color?: string }) {
  const [w, setW] = useState(0)
  const c = color ?? (points.length > 1 && points[points.length - 1] < points[0] ? colors.red : colors.green)
  return (
    <View onLayout={(e) => setW(Math.floor(e.nativeEvent.layout.width))} style={{ height }}>
      {w > 0 && points.length > 1 ? <Sparkline points={points} width={w} height={height} color={c} /> : null}
    </View>
  )
}

const DAY = ["M", "T", "W", "T", "F", "S", "S"]
const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

/** A month of trading days: each square is a day, green for a profit and red for a loss, deeper the bigger it is. Tap a day for its total. */
export function PnlCalendar({ byDay, onPick }: { byDay: Map<string, number>; onPick?: (day: Date, pnl: number | null) => void }) {
  const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })
  const [picked, setPicked] = useState<string | null>(null)
  const cells = useMemo(() => {
    const first = (month.getDay() + 6) % 7  // Monday first
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const out: (Date | null)[] = Array(first).fill(null)
    for (let d = 1; d <= days; d++) out.push(new Date(month.getFullYear(), month.getMonth(), d))
    while (out.length % 7) out.push(null)
    return out
  }, [month])
  const vals = cells.flatMap((d) => (d && byDay.has(key(d)) ? [Math.abs(byDay.get(key(d))!)] : []))
  const max = Math.max(1, ...vals)
  const total = cells.reduce((a, d) => a + (d ? byDay.get(key(d)) ?? 0 : 0), 0)
  const shift = (n: number) => { setPicked(null); setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1)) }
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= new Date()

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Pressable onPress={() => shift(-1)} hitSlop={12}><Text style={{ color: colors.muted, fontSize: 20, paddingHorizontal: 6 }}>‹</Text></Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>{month.toLocaleDateString([], { month: "long", year: "numeric" })}</Text>
          <Text style={{ color: total > 0 ? colors.green : total < 0 ? colors.red : colors.muted, fontSize: 12, fontWeight: "700" }}>{money(total, "USD", true)}</Text>
        </View>
        <Pressable onPress={() => next && shift(1)} hitSlop={12} style={{ opacity: next ? 1 : 0.25 }}><Text style={{ color: colors.muted, fontSize: 20, paddingHorizontal: 6 }}>›</Text></Pressable>
      </View>
      <View style={{ flexDirection: "row", marginBottom: 4 }}>{DAY.map((d, i) => <Text key={i} style={{ flex: 1, textAlign: "center", color: colors.muted, fontSize: 10, fontWeight: "700" }}>{d}</Text>)}</View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((d, i) => {
          const v = d ? byDay.get(key(d)) : undefined
          const a = v == null ? 0 : 0.18 + 0.62 * (Math.abs(v) / max)
          const c = v == null ? colors.border : v >= 0 ? colors.green : colors.red
          const sel = d && picked === key(d)
          return (
            <View key={i} style={{ width: `${100 / 7}%`, padding: 2 }}>
              {d ? (
                <Pressable onPress={() => { const k = key(d); setPicked(k); onPick?.(d, v ?? null) }}
                  style={{ aspectRatio: 1, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: v == null ? `${colors.border}55` : `${c}${Math.round(a * 255).toString(16).padStart(2, "0")}`, borderWidth: sel ? 1.5 : 0, borderColor: colors.text }}>
                  <Text style={{ color: v == null ? colors.muted : colors.text, fontSize: 11, fontWeight: v == null ? "500" : "800" }}>{d.getDate()}</Text>
                </Pressable>
              ) : null}
            </View>
          )
        })}
      </View>
    </View>
  )
}

/** Wins against losses as one split bar with the counts at each end. */
export function SplitBar({ left, right, leftLabel, rightLabel }: { left: number; right: number; leftLabel: string; rightLabel: string }) {
  const t = left + right || 1
  return (
    <View>
      <View style={{ flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: `${colors.muted}33` }}>
        <View style={{ flex: left / t, backgroundColor: colors.green }} />
        <View style={{ width: 2 }} />
        <View style={{ flex: right / t, backgroundColor: colors.red }} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ color: colors.green, fontSize: 12, fontWeight: "700" }}>{left} {leftLabel}</Text>
        <Text style={{ color: colors.red, fontSize: 12, fontWeight: "700" }}>{right} {rightLabel}</Text>
      </View>
    </View>
  )
}

/** Progress from 0 to 1 over `ms`, restarted whenever `key` changes (a chart grows in again when its data does). */
function useGrow(key: string, ms = 900) {
  const reduced = useReducedMotion()
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current
  const [p, setP] = useState(reduced ? 1 : 0)
  useEffect(() => {
    if (reduced) { setP(1); return }
    v.setValue(0)
    const id = v.addListener(({ value }) => setP(value))
    Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
    return () => v.removeListener(id)
  }, [key, reduced, ms, v])
  return p
}

/** Columns above and below a zero line, growing in one after another. Tap one to read it. */
export function Columns({ data, height = 130, format, labelEvery = 1, color }: { data: { label: string; value: number }[]; height?: number; format: (n: number) => string; labelEvery?: number; color?: (d: { label: string; value: number }, i: number) => string }) {
  const [sel, setSel] = useState<number | null>(null)
  const p = useGrow(data.map((d) => d.value.toFixed(2)).join(","))
  const top = Math.max(0, ...data.map((d) => d.value)), bot = Math.max(0, ...data.map((d) => -d.value))
  const scale = height / (top + bot || 1), zero = top * scale
  const n = data.length
  const chosen = sel != null ? data[sel] : null
  return (
    <View>
      <Text style={{ color: chosen ? (color ? color(chosen, sel!) : chosen.value >= 0 ? colors.green : colors.red) : colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 8, height: 16 }}>
        {chosen ? `${chosen.label}: ${format(chosen.value)}` : "Tap a bar"}
      </Text>
      <View style={{ height, flexDirection: "row" }}>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: zero, height: 1, backgroundColor: `${colors.muted}44` }} />
        {data.map((d, i) => {
          const local = Math.max(0, Math.min(1, p * (n + 3) / 3 - i / 3))  // each bar starts a little after the one before
          const h = Math.max(d.value === 0 ? 0 : 2, Math.abs(d.value) * scale * local)
          const c = color ? color(d, i) : d.value >= 0 ? colors.green : colors.red
          return (
            <Pressable key={i} onPress={() => { tick(); setSel(sel === i ? null : i) }} style={{ flex: 1, paddingHorizontal: n > 20 ? 1 : 3 }}>
              <View style={{ position: "absolute", left: n > 20 ? 1 : 3, right: n > 20 ? 1 : 3, top: d.value >= 0 ? zero - h : zero, height: h, borderRadius: 3, backgroundColor: c, opacity: sel == null || sel === i ? 1 : 0.35 }} />
            </Pressable>
          )
        })}
      </View>
      <View style={{ flexDirection: "row", marginTop: 6 }}>
        {data.map((d, i) => <Text key={i} numberOfLines={1} style={{ flex: 1, textAlign: "center", color: sel === i ? colors.text : colors.muted, fontSize: 9.5, fontWeight: "600", opacity: i % labelEvery === 0 ? 1 : 0 }}>{d.label}</Text>)}
      </View>
    </View>
  )
}

/** Ranked rows: a label, a bar that fills out to its share of the biggest, and the figure. */
export function RankBars({ rows, format }: { rows: { key: string; value: number; sub?: string }[]; format: (n: number) => string }) {
  const p = useGrow(rows.map((r) => `${r.key}${r.value.toFixed(1)}`).join(","), 800)
  const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.value)))
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r, i) => {
        const local = Math.max(0, Math.min(1, p * (rows.length + 1) - i * 0.6))
        const c = r.value >= 0 ? colors.green : colors.red
        return (
          <View key={r.key}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
              <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: "700", flex: 1, paddingRight: 8 }}>{r.key}{r.sub ? <Text style={{ color: colors.muted, fontWeight: "500" }}>  {r.sub}</Text> : null}</Text>
              <Text style={{ color: c, fontSize: 13, fontWeight: "800" }}>{format(r.value)}</Text>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: `${colors.muted}26`, overflow: "hidden" }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: c, width: `${(Math.abs(r.value) / max) * 100 * local}%` }} />
            </View>
          </View>
        )
      })}
    </View>
  )
}

/**
 * A line with a filled area that draws itself in. `baseline` is a dashed reference line (zero for a drawdown, 50 for a win rate); the fill runs from the line to `fillTo`.
 * `from`/`to` fix the scale when it should not follow the data (a win rate always spans 0 to 100).
 */
export function AreaChart({ points, height = 96, color = colors.green, baseline, fillTo = "bottom", from, to }: { points: number[]; height?: number; color?: string; baseline?: number; fillTo?: "top" | "bottom"; from?: number; to?: number }) {
  const [w, setW] = useState(0)
  const p = useGrow(points.length + ":" + points.slice(-3).map((v) => v.toFixed(1)).join(","), 1100)
  const n = points.length
  if (n < 2) return <View style={{ height }} />
  const lo = from ?? Math.min(...points, baseline ?? Infinity), hi = to ?? Math.max(...points, baseline ?? -Infinity), span = hi - lo || 1
  const y = (v: number) => 4 + ((hi - v) / span) * (height - 8)
  const x = (i: number) => (i / (n - 1)) * w
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")
  let len = 0
  for (let i = 1; i < n; i++) len += Math.hypot(x(i) - x(i - 1), y(points[i]) - y(points[i - 1]))
  const edge = fillTo === "top" ? 0 : height
  const id = `ar${color.slice(1)}${fillTo}`
  return (
    <View onLayout={(e) => setW(Math.floor(e.nativeEvent.layout.width))} style={{ height }}>
      {w > 0 ? (
        <Svg width={w} height={height}>
          <Defs><SvgGradient id={id} x1="0" y1={fillTo === "top" ? "1" : "0"} x2="0" y2={fillTo === "top" ? "0" : "1"}><Stop offset="0" stopColor={color} stopOpacity={0.4} /><Stop offset="1" stopColor={color} stopOpacity={0} /></SvgGradient></Defs>
          {baseline != null ? <Line x1={0} x2={w} y1={y(baseline)} y2={y(baseline)} stroke={colors.muted} strokeOpacity={0.5} strokeWidth={1} strokeDasharray={[3, 4]} /> : null}
          <Path d={`${line} L${w} ${edge} L0 ${edge} Z`} fill={`url(#${id})`} opacity={p} />
          <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={[len * p, len]} />
        </Svg>
      ) : null}
    </View>
  )
}
