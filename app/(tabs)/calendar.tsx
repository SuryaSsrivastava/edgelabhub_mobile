import { Ionicons } from "@expo/vector-icons"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { api, type EconEvent, type NewsAlerts } from "../../src/api"
import { clock, dayLabel, until } from "../../src/format"
import { useLoad } from "../../src/hooks"
import { colors, impactColor } from "../../src/theme"
import { Card, Empty, ErrorNote, Label, Loading, Muted, Pill, Row, Screen, Title } from "../../src/ui"

const IMPORTANCE = [["high", "High impact"], ["medium", "Medium+"], ["low", "All"]] as const
const REGIONS = [["US", "US"], ["EU", "Euro"], ["GB", "UK"], ["JP", "Japan"], ["AU", "Aus"], ["CA", "Canada"], ["CH", "Swiss"], ["NZ", "NZ"], ["CN", "China"], ["IN", "India"]] as const

export default function Calendar() {
  const [importance, setImportance] = useState<string>("high")
  const [regions, setRegions] = useState<string[]>(["US"]) // US to start; tap others to add them
  const events = useLoad(() => api.calendar(importance, regions), { every: 60_000, deps: [importance, regions.join(",")] })
  const [alerts, setAlerts] = useState<NewsAlerts>({ enabled: false, currencies: [], lead_minutes: 15, events: [] })
  useEffect(() => { api.newsAlerts().then(setAlerts).catch(() => {}) }, [])
  const [saveError, setSaveError] = useState<string | null>(null)

  const list = events.data?.events ?? []
  const toggleBell = useCallback(async (series: string) => {
    const next = { ...alerts, events: alerts.events.includes(series) ? alerts.events.filter((x) => x !== series) : [...alerts.events, series] }
    setAlerts(next); setSaveError(null)
    try { setAlerts(await api.saveNewsAlerts(next)) } catch (e) { setSaveError(e instanceof Error ? e.message : "Could not save the alert."); api.newsAlerts().then(setAlerts).catch(() => {}) }
  }, [alerts])
  const toggleRegion = (c: string) => setRegions((r) => (r.includes(c) ? (r.length > 1 ? r.filter((x) => x !== c) : r) : [...r, c]))

  const groups = useMemo(() => {
    const out: { label: string; items: EconEvent[] }[] = []
    for (const e of list) { const l = dayLabel(e.time); const g = out[out.length - 1]; if (g && g.label === l) g.items.push(e); else out.push({ label: l, items: [e] }) }
    return out
  }, [list])

  return (
    <Screen refreshing={events.refreshing} onRefresh={events.refresh}>
      <Title sub="Tap the bell to be alerted before an event, every time it comes round">Calendar</Title>
      <Row style={{ flexWrap: "wrap" }}>{IMPORTANCE.map(([id, label]) => <Pill key={id} active={importance === id} onPress={() => setImportance(id)}>{label}</Pill>)}</Row>
      <Row style={{ flexWrap: "wrap" }}>{REGIONS.map(([id, label]) => <Pill key={id} active={regions.includes(id)} color={colors.blue} onPress={() => toggleRegion(id)}>{label}</Pill>)}</Row>
      {events.error ? <ErrorNote>{events.error}</ErrorNote> : null}
      {saveError ? <ErrorNote>{saveError}</ErrorNote> : null}
      {!events.loaded ? <Loading /> : list.length === 0 ? <Empty title="No releases" text={events.data?.available === false ? "The calendar is not reachable right now. Pull down to try again." : "Nothing matches these filters."} /> : groups.map((g) => (
        <View key={g.label}>
          <Label>{g.label}</Label>
          {g.items.map((e) => {
            const past = +new Date(e.time) <= Date.now()
            const followed = alerts.events.includes(e.series)
            const byCurrency = alerts.enabled && e.importance === "high" && alerts.currencies.includes(e.currency)
            return (
              <Card key={e.id} style={{ opacity: past && !e.actual ? 0.55 : 1 }}>
                <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Row>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: impactColor[e.importance], marginRight: 8 }} />
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700", flexShrink: 1 }}>{e.name}</Text>
                    </Row>
                    <Muted style={{ marginTop: 4 }}>{clock(e.time)} · {e.country} · {e.currency}{!past && +new Date(e.time) - Date.now() < 3_600_000 * 6 ? ` · in ${until(e.time)}` : ""}</Muted>
                  </View>
                  {e.importance === "high" && !past ? (
                    byCurrency ? <Ionicons name="notifications" size={20} color={`${colors.amber}99`} /> : (
                      <Pressable onPress={() => toggleBell(e.series)} hitSlop={10}><Ionicons name={followed ? "notifications" : "notifications-outline"} size={22} color={followed ? colors.amber : colors.muted} /></Pressable>
                    )
                  ) : null}
                </Row>
                <Row style={{ marginTop: 10, justifyContent: "space-between" }}>
                  <Figure label="Actual" value={e.actual} up={e.above_forecast} bold />
                  <Figure label="Forecast" value={e.forecast} />
                  <Figure label="Previous" value={e.previous} />
                </Row>
              </Card>
            )
          })}
        </View>
      ))}
    </Screen>
  )
}

function Figure({ label, value, up, bold }: { label: string; value: string; up?: boolean | null; bold?: boolean }) {
  return (
    <View style={{ minWidth: 80 }}>
      <Label>{label}</Label>
      <Row>
        {up === true ? <Ionicons name="arrow-up" size={12} color={colors.green} style={{ marginRight: 2 }} /> : up === false ? <Ionicons name="arrow-down" size={12} color={colors.red} style={{ marginRight: 2 }} /> : null}
        <Text style={{ color: value ? colors.text : colors.muted, fontSize: 14, fontWeight: bold ? "800" : "500" }}>{value || "-"}</Text>
      </Row>
    </View>
  )
}
