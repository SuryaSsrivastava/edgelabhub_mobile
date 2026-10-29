import { useEffect, useMemo, useRef } from "react"
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native"
import Svg, { Defs, LinearGradient as SvgGradient, Line, Path, Stop } from "react-native-svg"
import { colors } from "./theme"

/**
 * The layers behind every screen, all very faint so text stays easy to read, and all moved by the phone's own animation engine (nothing is redrawn while they move):
 * a grid that drifts upward, two chart-like lines that scroll across for ever, and small glowing particles that rise and fade.
 */
export function Backdrop({ reduced }: { reduced: boolean }) {
  const { width: W, height: H } = useWindowDimensions()
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Grid W={W} H={H} reduced={reduced} />
      <Wave W={W} H={H} y={0.62} amp={46} color={colors.green} seconds={46} opacity={0.2} waves={[[1, 1, 0.2], [2, 0.5, 1.7], [3, 0.25, 4.1]]} reduced={reduced} />
      <Wave W={W} H={H} y={0.8} amp={34} color="#6366f1" seconds={64} opacity={0.17} waves={[[1, 1, 3.3], [3, 0.45, 0.6], [5, 0.2, 2.2]]} reduced={reduced} />
      <Motes W={W} H={H} reduced={reduced} />
    </View>
  )
}

// ---- grid ------------------------------------------------------------------------------------------------------------------------------------------------------------------

const CELL = 44

function Grid({ W, H, reduced }: { W: number; H: number; reduced: boolean }) {
  const y = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (reduced) return
    const loop = Animated.loop(Animated.timing(y, { toValue: -CELL, duration: 9000, easing: Easing.linear, useNativeDriver: true }))  // one cell up, then it starts again where it began: seamless
    loop.start()
    return () => loop.stop()
  }, [reduced, y])
  const rows = Math.ceil(H / CELL) + 2, cols = Math.ceil(W / CELL) + 1
  return (
    <Animated.View style={{ position: "absolute", left: 0, top: 0, width: W, height: H + CELL * 2, opacity: 0.07, transform: [{ translateY: y }] }}>
      <Svg width={W} height={H + CELL * 2}>
        {Array.from({ length: rows }, (_, i) => <Line key={`r${i}`} x1={0} x2={W} y1={i * CELL} y2={i * CELL} stroke={colors.text} strokeWidth={1} />)}
        {Array.from({ length: cols }, (_, i) => <Line key={`c${i}`} x1={i * CELL} x2={i * CELL} y1={0} y2={H + CELL * 2} stroke={colors.text} strokeWidth={1} />)}
      </Svg>
    </Animated.View>
  )
}

// ---- chart lines ------------------------------------------------------------------------------------------------------------------------------------------------------

/** A line made of a few sine waves that each fit a whole number of times into the width, so its two ends meet: two copies side by side slide left for ever with no join to see. */
function Wave({ W, H, y, amp, color, seconds, opacity, waves, reduced }: { W: number; H: number; y: number; amp: number; color: string; seconds: number; opacity: number; waves: [number, number, number][]; reduced: boolean }) {
  const x = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (reduced) return
    const loop = Animated.loop(Animated.timing(x, { toValue: -W, duration: seconds * 1000, easing: Easing.linear, useNativeDriver: true }))
    loop.start()
    return () => loop.stop()
  }, [reduced, seconds, W, x])
  const d = useMemo(() => {
    const N = 90, mid = amp * 1.6
    const pts = Array.from({ length: N + 1 }, (_, i) => {
      const t = i / N
      const v = waves.reduce((s, [f, a, ph]) => s + a * Math.sin(2 * Math.PI * f * t + ph), 0)
      return `${i === 0 ? "M" : "L"}${(t * W).toFixed(1)} ${(mid + v * amp * 0.6).toFixed(1)}`
    })
    return pts.join(" ")
  }, [W, amp, waves])
  const h = amp * 3.2
  const id = `wv${color.slice(1)}`
  return (
    <Animated.View style={{ position: "absolute", left: 0, top: H * y - h / 2, width: W * 2, height: h, opacity, transform: [{ translateX: x }] }}>
      <Svg width={W * 2} height={h}>
        <Defs><SvgGradient id={id} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={color} stopOpacity={0.35} /><Stop offset="1" stopColor={color} stopOpacity={0} /></SvgGradient></Defs>
        {[0, W].map((dx) => (
          <Path key={dx} d={`${d} L${W} ${h} L0 ${h} Z`} fill={`url(#${id})`} transform={`translate(${dx} 0)`} />
        ))}
        {[0, W].map((dx) => (
          <Path key={`l${dx}`} d={d} stroke={color} strokeWidth={1.6} fill="none" strokeLinejoin="round" strokeLinecap="round" transform={`translate(${dx} 0)`} />
        ))}
      </Svg>
    </Animated.View>
  )
}

// ---- particles --------------------------------------------------------------------------------------------------------------------------------------------------------------

/** A tiny repeatable pseudo-random number (the same dots every time the app opens, and none move when something else on the screen re-renders). */
const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }

function Motes({ W, H, reduced }: { W: number; H: number; reduced: boolean }) {
  const dots = useMemo(() => {
    const r = seeded(20261029)
    return Array.from({ length: 16 }, (_, i) => ({ key: i, x: r() * W, size: 2 + r() * 2.6, dur: 14000 + r() * 16000, start: r(), color: i % 3 === 0 ? colors.blue : i % 3 === 1 ? colors.green : "#a78bfa", peak: 0.35 + r() * 0.4 }))
  }, [W])
  return <>{dots.map(({ key, ...d }) => <Mote key={key} H={H} {...d} reduced={reduced} />)}</>
}

function Mote({ x, size, dur, start, color, peak, H, reduced }: { x: number; size: number; dur: number; start: number; color: string; peak: number; H: number; reduced: boolean }) {
  const v = useRef(new Animated.Value(start)).current
  useEffect(() => {
    if (reduced) return
    const run = Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: dur * (1 - start), easing: Easing.linear, useNativeDriver: true }),  // first, finish the climb it was already part way through
      Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }), Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true })])),
    ])
    run.start()
    return () => run.stop()
  }, [reduced, dur, start, v])
  if (reduced) return null
  return (
    <Animated.View style={{ position: "absolute", left: x, top: 0, width: size, height: size, borderRadius: size, backgroundColor: color, shadowColor: color, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, opacity: v.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, peak, peak, 0] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [H + 10, -20] }) }, { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 14, -8] }) }] }} />
  )
}
