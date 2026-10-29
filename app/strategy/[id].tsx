import { Stack, useLocalSearchParams } from "expo-router"
import { Text, View } from "react-native"
import { api, type BacktestTrade } from "../../src/api"
import { Curve } from "../../src/charts"
import { Rise, Stat } from "../../src/fx"
import { dayLabel } from "../../src/format"
import { useLoad } from "../../src/hooks"
import { colors } from "../../src/theme"
import { Card, Empty, ErrorNote, Label, Loading, Muted, Row, Screen, Title, tone } from "../../src/ui"

const sgn = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`

export default function StrategyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const all = useLoad(() => api.strategies(60), { deps: [id] })
  const row = all.data?.find((r) => r.s.id === Number(id)) ?? null
  const bt = row?.stats?.backtest_id
  const trades = useLoad(async () => (bt ? api.backtestTrades(bt) : []), { deps: [bt] })
  const list = trades.data ?? []
  let run = 0
  const curve = [0, ...list.map((t) => (run += t.r_multiple))]
  const st = row?.stats
  const win = st?.win_rate != null ? Math.round(st.win_rate * 100) : null

  return (
    <Screen refreshing={all.refreshing} onRefresh={() => { void all.refresh(); void trades.refresh() }} padTop={false}>
      <Stack.Screen options={{ title: row?.s.name ?? "Strategy" }} />
      {all.error ? <ErrorNote>{all.error}</ErrorNote> : null}
      {!all.loaded ? <Loading /> : !row ? <Empty title="Strategy not found" /> : (
        <>
          <Title sub={[row.symbol, `v${row.s.version}`].filter(Boolean).join(" · ")}>{row.s.name}</Title>
          {row.s.description ? <Muted style={{ marginBottom: 12, lineHeight: 19 }}>{row.s.description}</Muted> : null}
          {!st ? <Empty title="Not backtested yet" text="Run a backtest on the website and the results appear here." /> : (
            <>
              <Card>
                <Muted>Total result</Muted>
                <Text style={{ color: tone(st.total_r), fontSize: 32, fontWeight: "800", letterSpacing: -1 }}>{st.total_r != null ? `${sgn(st.total_r)}R` : "-"}</Text>
                <View style={{ marginTop: 8 }}>{curve.length > 2 ? <Curve points={curve} height={110} /> : null}</View>
              </Card>
              <Rise delay={100}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  <Stat label="Trades">{String(st.trades)}</Stat>
                  <Stat label="Win rate">{win != null ? `${win}%` : "-"}</Stat>
                  <Stat label="Per trade" tint={tone(st.expectancy_r)}>{st.expectancy_r != null ? `${sgn(st.expectancy_r)}R` : "-"}</Stat>
                  <Stat label="Profit factor">{st.profit_factor ? st.profit_factor.toFixed(2) : "-"}</Stat>
                  <Stat label="Max drawdown" tint={colors.red}>{st.max_drawdown_pct != null ? `${st.max_drawdown_pct.toFixed(1)}%` : st.max_drawdown_r != null ? `${st.max_drawdown_r.toFixed(1)}R` : "-"}</Stat>
                  <Stat label="Return" tint={tone(st.return_pct)}>{st.return_pct != null ? `${sgn(st.return_pct, 1)}%` : "-"}</Stat>
                </View>
              </Rise>
              <Label>Latest trades</Label>
              {!trades.loaded ? <Loading /> : list.length === 0 ? <Muted>No trades in this run.</Muted> : [...list].reverse().slice(0, 40).map((t) => <TradeRow key={t.id} t={t} />)}
            </>
          )}
        </>
      )}
    </Screen>
  )
}

function TradeRow({ t }: { t: BacktestTrade }) {
  return (
    <Card style={{ paddingVertical: 11 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}><Text style={{ color: t.side.toLowerCase() === "short" ? colors.red : colors.green }}>{t.side.toUpperCase()}</Text> {t.symbol}</Text>
          <Muted>{dayLabel(t.entry_at)} · {t.exit_reason} · {t.session}</Muted>
        </View>
        <Text style={{ color: tone(t.r_multiple), fontSize: 15, fontWeight: "800" }}>{sgn(t.r_multiple)}R</Text>
      </Row>
    </Card>
  )
}
