import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { api, type JournalTrade } from "../../src/api"
import { Columns, Curve, PnlCalendar, RankBars } from "../../src/charts"
import { DayTrades } from "../../src/day"
import { CountUp, Press, Rise, Ring, Stat } from "../../src/fx"
import { dayLabel, money } from "../../src/format"
import { useLoad } from "../../src/hooks"
import { breakdown, dailySeries, equityPoints, groupByDay, inRange, journalStats, maxDrawdown, pnlByDay, pnlOf, rOf, streaks, weekdays } from "../../src/journal"
import { ShotBadge } from "../../src/shots"
import { inMode, inScope, ScopeBar, useScope } from "../../src/scope"
import { colors, radius } from "../../src/theme"
import { Button, Card, Empty, ErrorNote, Label, Loading, Muted, Pill, Row, Screen, Title, tone } from "../../src/ui"

const sgn = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`
const usd = (n: number) => money(n, "USD", true)
type Tab = "overview" | "trades" | "calendar"
const TABS: [Tab, string, React.ComponentProps<typeof Ionicons>["name"]][] = [["overview", "Overview", "stats-chart"], ["trades", "Trades", "list"], ["calendar", "Calendar", "calendar"]]
const RANGES: [string, number][] = [["7D", 7], ["30D", 30], ["90D", 90], ["All", 0]]
type Filter = "all" | "wins" | "losses" | "long" | "short"
const FILTERS: [Filter, string][] = [["all", "All"], ["wins", "Wins"], ["losses", "Losses"], ["long", "Long"], ["short", "Short"]]
const keep = (f: Filter, t: JournalTrade) => f === "all" || (f === "wins" ? pnlOf(t) > 0 : f === "losses" ? pnlOf(t) < 0 : t.side.toLowerCase() === f)
const big = { fontSize: 19, fontWeight: "800" } as const

export default function Journal() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("overview")
  const [range, setRange] = useState(0)
  const [filter, setFilter] = useState<Filter>("all")
  const [day, setDay] = useState<Date | null>(null)
  const trades = useLoad(() => api.journalTrades(500))
  const accounts = useLoad(() => api.accounts())
  const counts = useLoad(() => api.journalShotCounts())
  const { mode, filter: accts, setMode } = useScope()
  const every = trades.data ?? []
  const all = every.filter((t) => inScope(t, mode, accts))  // follows the account chosen on Home or here
  const other = (["backtest", "manual"] as const).map((m) => ({ m, n: every.filter((t) => inMode(t, m)).length })).filter((x) => x.m !== mode && x.n > 0)

  return (
    <Screen refreshing={trades.refreshing} onRefresh={() => { void trades.refresh(); void counts.refresh() }}>
      <Title brand sub={`${all.length} trade${all.length === 1 ? "" : "s"}`} right={<Press onPress={() => router.push("/trade/new")}><View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.green, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 }}><Ionicons name="add" size={18} color="#04110b" /><Text style={{ color: "#04110b", fontWeight: "800", fontSize: 13 }}>Log trade</Text></View></Press>}>Journal</Title>
      <ScopeBar trades={every} accounts={accounts.data?.accounts ?? []} />
      {trades.error ? <ErrorNote>{trades.error}</ErrorNote> : null}

      {!trades.loaded ? <Loading /> : all.length === 0 ? (
        <Rise>
          {every.length === 0 ? <Empty title="Your journal is empty" text="Log your first trade, or connect an account on the website. Both journals are the same." /> : (
            <Card>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>Nothing in this view</Text>
              <Muted style={{ marginTop: 4, marginBottom: 12 }}>{other.length > 0 ? "You have trades in another view of your journal:" : "Pick another account above."}</Muted>
              {other.map(({ m, n }) => <View key={m} style={{ marginBottom: 8 }}><Button tone="ghost" onPress={() => setMode(m)}>{m === "backtest" ? `Show backtested trades (${n})` : `Show manual journal (${n})`}</Button></View>)}
            </Card>
          )}
        </Rise>
      ) : (
        <>
          <Segmented tab={tab} onChange={(t) => { setTab(t); setDay(null) }} />
          <Rise key={tab}>
            {tab === "overview" ? <Overview trades={all} range={range} setRange={setRange} />
              : tab === "trades" ? <TradeList trades={all} counts={counts.data ?? {}} filter={filter} setFilter={setFilter} onOpen={(id) => router.push(`/trade/${id}`)} />
              : (
                <>
                  <Card><PnlCalendar byDay={pnlByDay(all)} onPick={(d) => setDay(d)} />{!day ? <Muted style={{ textAlign: "center", marginTop: 10 }}>Tap a day to see its trades and screenshots.</Muted> : null}</Card>
                  {day ? <DayTrades day={day} trades={all} counts={counts.data ?? {}} onOpen={(id) => router.push(`/trade/${id}`)} /> : null}
                </>
              )}
          </Rise>
        </>
      )}
    </Screen>
  )
}

/** Overview, Trades and Calendar as one rounded control. */
function Segmented({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: colors.card, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, padding: 4, marginBottom: 14 }}>
      {TABS.map(([k, l, icon]) => {
        const on = tab === k
        return (
          <Pressable key={k} onPress={() => onChange(k)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: on ? `${colors.green}26` : "transparent", borderWidth: 1, borderColor: on ? `${colors.green}66` : "transparent" }}>
            <Ionicons name={icon} size={15} color={on ? colors.green : colors.muted} />
            <Text style={{ color: on ? colors.text : colors.muted, fontSize: 13, fontWeight: on ? "800" : "600" }}>{l}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function Overview({ trades, range, setRange }: { trades: JournalTrade[]; range: number; setRange: (n: number) => void }) {
  const t = inRange(trades, range)
  const st = journalStats(t)
  const run = streaks(t)
  const dd = maxDrawdown(t)
  const daily = dailySeries(t, 30)
  const best = daily.reduce((m, d) => (d.pnl > m ? d.pnl : m), 0)
  const setups = breakdown(t, (x) => (x.setup ? [x.setup] : [])).slice(0, 6)
  const feelings = breakdown(t, (x) => x.emotions).slice(0, 6)
  const discipline = breakdown(t, (x) => (x.followed_plan === true ? ["Followed the plan"] : x.followed_plan === false ? ["Broke the plan"] : []))
  const wins = st.wins, losses = st.losses

  return (
    <>
      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Muted>Net result</Muted>
          <Row>{RANGES.map(([l, d]) => <Pill key={l} active={range === d} onPress={() => setRange(d)}>{l}</Pill>)}</Row>
        </Row>
        {t.length === 0 ? <Muted style={{ marginVertical: 24, textAlign: "center" }}>No trades in this period.</Muted> : (
          <>
            <CountUp key={range} value={st.net} format={usd} style={{ color: tone(st.net), fontSize: 36, fontWeight: "800", letterSpacing: -1.2 }} />
            <View style={{ marginTop: 8 }}><Curve key={range} points={equityPoints(t)} height={130} /></View>
            <Row style={{ justifyContent: "space-between", marginTop: 8 }}>
              <Muted>Max drawdown <Text style={{ color: colors.red, fontWeight: "800" }}>{money(-dd)}</Text></Muted>
              <Muted>Best day <Text style={{ color: colors.green, fontWeight: "800" }}>{usd(best)}</Text></Muted>
            </Row>
          </>
        )}
      </Card>

      {t.length > 0 ? (
        <>
          <Rise delay={80}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <Stat label="Win rate"><CountUp key={range} value={st.winRate} format={(n) => `${n.toFixed(0)}%`} style={[big, { color: colors.text }]} /></Stat>
              <Stat label="Avg R"><CountUp key={range} value={st.avgR} format={(n) => `${sgn(n)}R`} style={[big, { color: tone(st.avgR) }]} /></Stat>
              <Stat label="Profit factor">{st.profitFactor === Infinity ? "∞" : st.profitFactor.toFixed(2)}</Stat>
              <Stat label="Streak" tint={run.current >= 0 ? colors.green : colors.red}>{run.current === 0 ? "-" : run.current > 0 ? `${run.current} wins` : `${-run.current} losses`}</Stat>
              <Stat label="Avg win" tint={colors.green}>{usd(st.avgWin)}</Stat>
              <Stat label="Avg loss" tint={colors.red}>{usd(st.avgLoss)}</Stat>
            </View>
          </Rise>

          <Card delay={140}>
            <Label>Daily P&L</Label>
            <Columns data={daily.map((d) => ({ label: String(new Date(d.iso).getDate()), value: d.pnl }))} format={usd} labelEvery={daily.length > 14 ? 3 : 1} />
          </Card>

          <Card delay={200}>
            <Label>Wins and losses</Label>
            <Row style={{ gap: 18 }}>
              <Ring size={120} stroke={13} slices={[{ pct: st.winRate, color: colors.green }, { pct: 100 - st.winRate, color: colors.red }]}>
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>{st.winRate.toFixed(0)}%</Text><Muted>win rate</Muted>
              </Ring>
              <View style={{ flex: 1, gap: 8 }}>
                <Row style={{ justifyContent: "space-between" }}><Row><Dot c={colors.green} /><Text style={lbl}>Wins</Text></Row><Text style={[val, { color: colors.green }]}>{wins}</Text></Row>
                <Row style={{ justifyContent: "space-between" }}><Row><Dot c={colors.red} /><Text style={lbl}>Losses</Text></Row><Text style={[val, { color: colors.red }]}>{losses}</Text></Row>
                <Row style={{ justifyContent: "space-between" }}><Text style={lbl}>Best trade</Text><Text style={[val, { color: colors.green }]}>{usd(st.best)}</Text></Row>
                <Row style={{ justifyContent: "space-between" }}><Text style={lbl}>Worst trade</Text><Text style={[val, { color: colors.red }]}>{usd(st.worst)}</Text></Row>
                <Row style={{ justifyContent: "space-between" }}><Text style={lbl}>Longest win run</Text><Text style={val}>{run.bestWin}</Text></Row>
              </View>
            </Row>
          </Card>

          <Card delay={260}>
            <Label>By weekday</Label>
            <Columns data={weekdays(t).map((d) => ({ label: d.label, value: d.pnl }))} format={usd} height={110} />
          </Card>

          {setups.length > 0 ? <Card delay={300}><Label>Setups</Label><RankBars rows={setups.map((x) => ({ key: x.key, value: x.net, sub: `${x.n} trade${x.n === 1 ? "" : "s"} · ${x.winRate.toFixed(0)}% wins` }))} format={usd} /></Card> : null}
          {discipline.length > 0 ? <Card delay={340}><Label>Discipline</Label><RankBars rows={discipline.map((x) => ({ key: x.key, value: x.net, sub: `${x.n} trade${x.n === 1 ? "" : "s"}` }))} format={usd} /></Card> : null}
          {feelings.length > 0 ? <Card delay={380}><Label>Emotions</Label><RankBars rows={feelings.map((x) => ({ key: x.key, value: x.net, sub: `${x.n}×` }))} format={usd} /></Card> : null}
        </>
      ) : null}
    </>
  )
}

const lbl = { color: colors.muted, fontSize: 12.5, fontWeight: "600" } as const
const val = { color: colors.text, fontSize: 13.5, fontWeight: "800" } as const
const Dot = ({ c }: { c: string }) => <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, marginRight: 8 }} />

function TradeList({ trades, counts, filter, setFilter, onOpen }: { trades: JournalTrade[]; counts: Record<string, number>; filter: Filter; setFilter: (f: Filter) => void; onOpen: (id: number) => void }) {
  const groups = groupByDay(trades.filter((t) => keep(filter, t)))
  let i = 0
  return (
    <>
      <Row style={{ flexWrap: "wrap", marginBottom: 6 }}>{FILTERS.map(([k, l]) => <Pill key={k} active={filter === k} onPress={() => setFilter(k)}>{l}</Pill>)}</Row>
      {groups.length === 0 ? <Empty title="Nothing matches" text="Try another filter." /> : groups.map((g) => (
        <View key={g.iso} style={{ marginTop: 8 }}>
          <Row style={{ justifyContent: "space-between", marginBottom: 6, paddingHorizontal: 2 }}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6 }}>{dayLabel(g.iso).toUpperCase()}</Text>
            <Text style={{ color: tone(g.total), fontSize: 12, fontWeight: "800" }}>{money(g.total, "USD", true)}</Text>
          </Row>
          {g.trades.map((t) => <TradeRow key={t.id} t={t} shots={counts[t.id]} delay={Math.min(i++, 10) * 45} onPress={() => onOpen(t.id)} />)}
        </View>
      ))}
    </>
  )
}

function TradeRow({ t, shots, delay, onPress }: { t: JournalTrade; shots?: number; delay: number; onPress: () => void }) {
  const p = pnlOf(t)
  return (
    <Press onPress={onPress}>
      <Card delay={delay} style={{ paddingVertical: 12 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Row style={{ flex: 1, paddingRight: 10 }}>
            <View style={{ width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: tone(p), marginRight: 12, opacity: 0.9 }} />
            <View style={{ flex: 1 }}>
              <Row><Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{t.symbol} <Text style={{ color: t.side === "Short" ? colors.red : colors.green, fontSize: 11, fontWeight: "700" }}>{t.side.toUpperCase()}</Text></Text><ShotBadge n={shots} /></Row>
              <Muted numberOfLines={1}>{[t.setup, t.emotions[0], t.note].filter(Boolean).join(" · ") || `${t.qty} @ ${t.entry}`}</Muted>
            </View>
          </Row>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: tone(p), fontSize: 15, fontWeight: "800" }}>{money(p, "USD", true)}</Text>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>{sgn(rOf(t))}R</Text>
          </View>
        </Row>
      </Card>
    </Press>
  )
}
