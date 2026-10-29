import { useRouter } from "expo-router"
import { Pressable, Text, View } from "react-native"
import { api, type StrategyRow } from "../src/api"
import { useLoad } from "../src/hooks"
import { ago } from "../src/format"
import { colors } from "../src/theme"
import { Card, Empty, ErrorNote, Loading, Muted, Row, Screen, Title, tone } from "../src/ui"

const sgn = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`

export default function Strategies() {
  const router = useRouter()
  const list = useLoad(() => api.strategies())
  const rows = list.data ?? []
  return (
    <Screen refreshing={list.refreshing} onRefresh={list.refresh} padTop={false}>
      <Title sub="Build and run them on the website. Results show here.">Strategies</Title>
      {list.error ? <ErrorNote>{list.error}</ErrorNote> : null}
      {!list.loaded ? <Loading /> : rows.length === 0 ? <Empty title="No strategies yet" text="Describe a strategy on the website's Strategy Lab and it appears here." /> : rows.map((r) => <StrategyCard key={r.s.id} r={r} onPress={() => router.push(`/strategy/${r.s.id}`)} />)}
    </Screen>
  )
}

function StrategyCard({ r, onPress }: { r: StrategyRow; onPress: () => void }) {
  const st = r.stats
  return (
    <Pressable onPress={onPress}>
      <Card>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{r.s.name}</Text>
            <Muted>{[r.symbol, `v${r.s.version}`, `${r.runs} run${r.runs === 1 ? "" : "s"}`].filter(Boolean).join(" · ")} · {ago(r.s.updated_at)}</Muted>
          </View>
          {st?.total_r != null ? <View style={{ alignItems: "flex-end" }}><Text style={{ color: tone(st.total_r), fontSize: 16, fontWeight: "800" }}>{sgn(st.total_r)}R</Text><Muted>{st.trades} trades</Muted></View> : <Muted>not run</Muted>}
        </Row>
        {st?.win_rate != null ? <Row style={{ gap: 14, marginTop: 8 }}><Muted>{Math.round(st.win_rate * 100)}% wins</Muted>{st.expectancy_r != null ? <Muted>{sgn(st.expectancy_r)}R per trade</Muted> : null}{st.profit_factor ? <Muted>PF {st.profit_factor.toFixed(2)}</Muted> : null}</Row> : null}
      </Card>
    </Pressable>
  )
}
