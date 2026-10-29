import { useMemo, useRef, useState } from "react"
import { Animated, Image, PanResponder, View } from "react-native"

const MAX = 6
const dist = (t: readonly { pageX: number; pageY: number }[]) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY)

/** An image you can pinch to zoom, drag around once zoomed, and double-tap to zoom in or back out. Works the same on iPhone and Android. */
export function ZoomImage({ uri }: { uri: string }) {
  const [box, setBox] = useState({ w: 0, h: 0 })
  const scale = useRef(new Animated.Value(1)).current
  const x = useRef(new Animated.Value(0)).current
  const y = useRef(new Animated.Value(0)).current
  const cur = useRef({ s: 1, x: 0, y: 0 })
  const g = useRef({ dist: 0, s: 1, x: 0, y: 0, pinching: false, at: 0, lastTap: 0 })
  const size = useRef(box)
  size.current = box

  const put = (s: number, px: number, py: number, animate = false) => {
    // when zoomed, the picture can be dragged only as far as its edges
    const mx = ((s - 1) * size.current.w) / 2, my = ((s - 1) * size.current.h) / 2
    const nx = Math.max(-mx, Math.min(mx, px)), ny = Math.max(-my, Math.min(my, py))
    cur.current = { s, x: nx, y: ny }
    if (animate) Animated.parallel([scale, x, y].map((v, i) => Animated.spring(v, { toValue: [s, nx, ny][i], useNativeDriver: false, speed: 18, bounciness: 0 }))).start()
    else { scale.setValue(s); x.setValue(nx); y.setValue(ny) }
  }

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { g.current = { ...g.current, dist: 0, s: cur.current.s, x: cur.current.x, y: cur.current.y, pinching: false, at: Date.now() } },
    onPanResponderMove: (e, gs) => {
      const t = e.nativeEvent.touches
      if (t.length >= 2) {
        const d = dist(t)
        if (!g.current.pinching || !g.current.dist) g.current = { ...g.current, pinching: true, dist: d, s: cur.current.s }
        put(Math.max(1, Math.min(MAX, (g.current.s * d) / g.current.dist)), cur.current.x, cur.current.y)
      } else if (g.current.pinching) {
        // one finger lifted after a pinch: carry on dragging from where it is, without a jump
        g.current = { ...g.current, pinching: false, x: cur.current.x - gs.dx, y: cur.current.y - gs.dy }
      } else if (cur.current.s > 1) {
        put(cur.current.s, g.current.x + gs.dx, g.current.y + gs.dy)
      }
    },
    onPanResponderRelease: (_e, gs) => {
      const tap = Math.abs(gs.dx) < 8 && Math.abs(gs.dy) < 8 && Date.now() - g.current.at < 300 && !g.current.pinching
      const now = Date.now()
      if (tap && now - g.current.lastTap < 300) { g.current.lastTap = 0; cur.current.s > 1.05 ? put(1, 0, 0, true) : put(2.5, 0, 0, true) }  // double tap
      else if (tap) g.current.lastTap = now
      else if (cur.current.s < 1.05) put(1, 0, 0, true)
    },
  }), [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={{ flex: 1, overflow: "hidden" }} {...pan.panHandlers}>
      <Animated.View style={{ flex: 1, transform: [{ translateX: x }, { translateY: y }, { scale }] }}>
        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
      </Animated.View>
    </View>
  )
}
