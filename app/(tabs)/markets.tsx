import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { Pressable, Text, TextInput, View } from "react-native"
import { api, type Market, type ScreenRow } from "../../src/api"
import { Press } from "../../src/fx"
import { money } from "../../src/format"
import { useLoad } from "../../src/hooks"
import { colors, radius } from "../../src/theme"
import { Button, Card, Empty, ErrorNote, Loading, Muted, Pill, Row, Screen, Title, tone } from "../../src/ui"

const MARKETS: [Market, string, string][] = [["nse", "India", "INR"], ["us", "US stocks", "USD"], ["crypto", "Crypto", "USD"], ["forex", "Forex", ""]]
const SORTS: [string, string, { field: string; dir: "asc" | "desc" }][] = [
  ["top", "Top", { field: "market_cap", dir: "desc" }],
  ["gain", "Gainers", { field: "chg_1d", dir: "desc" }],
  ["lose", "Losers", { field: "chg_1d", dir: "asc" }],
  ["year", "1Y best", { field: "ret_1y", dir: "desc" }],
]
const pct = (n: number | null | undefined) => (n == null ? "-" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`)

export default function Markets() {
  const router = useRouter()
  const [market, setMarket] = useState<Market>("nse")
  const [sort, setSort] = useState("top")
  const [text, setText] = useState("")
  const [search, setSearch] = useState("")
  const [size, setSize] = useState(40)
  useEffect(() => { const t = setTimeout(() => setSearch(text.trim()), 350); return () => clearTimeout(t) }, [text])
  useEffect(() => setSize(40), [market, sort, search])

  // crypto and forex have no market cap: their default order is the server's own
  const by = SORTS.find((s) => s[0] === sort)![2]
  const sortSpec = sort === "top" && (market === "crypto" || market === "forex") ? null : by
  const res = useLoad(() => api.screen(market, { filters: [], sort: sortSpec, search }, 0, size), { deps: [market, sort, search, size] })
  const cur = MARKETS.find((m) => m[0] === market)![2]
  const rows = res.data?.rows ?? []

  return (
    <Screen refreshing={res.refreshing} onRefresh={res.refresh}>
      <Title brand sub="Screen stocks, crypto and forex" right={<Press onPress={() => router.push("/calendar")}><View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 }}><Ionicons name="calendar-outline" size={16} color={colors.text} /><Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>Calendar</Text></View></Press>}>Markets</Title>
      <Row style={{ flexWrap: "wrap" }}>{MARKETS.map(([k, l]) => <Pill key={k} active={market === k} onPress={() => setMarket(k)} color={colors.blue}>{l}</Pill>)}</Row>
      <Row style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, marginVertical: 10 }}>
        <Ionicons name="search" size={17} color={colors.muted} />
        <TextInput value={text} onChangeText={setText} placeholder="Search a name or symbol" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} style={{ flex: 1, color: colors.text, fontSize: 15, paddingVertical: 12, marginLeft: 8 }} />
        {text ? <Pressable onPress={() => setText("")} hitSlop={10}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
      </Row>
      {market !== "forex" ? <Row style={{ flexWrap: "wrap", marginBottom: 6 }}>{SORTS.map(([k, l]) => <Pill key={k} active={sort === k} onPress={() => setSort(k)}>{l}</Pill>)}</Row> : null}

      {res.error ? <ErrorNote>{res.error}</ErrorNote> : null}
      {!res.loaded ? <Loading /> : rows.length === 0 ? <Empty title="No matches" text="Try a different search." /> : (
        <>
          {rows.map((r) => <AssetRow key={`${r.market}:${r.symbol}`} r={r} cur={cur} onPress={() => router.push(`/asset/${r.market}/${encodeURIComponent(r.symbol)}`)} />)}
          {(res.data?.total ?? 0) > rows.length ? <View style={{ marginTop: 6 }}><Button tone="ghost" onPress={() => setSize((n) => n + 40)}>Show more</Button></View> : <Muted style={{ textAlign: "center", marginTop: 8 }}>{res.data?.total} result{res.data?.total === 1 ? "" : "s"}</Muted>}
        </>
      )}
    </Screen>
  )
}

function AssetRow({ r, cur, onPress }: { r: ScreenRow; cur: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ paddingVertical: 12 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{r.symbol.replace("=X", "")}</Text>
            <Muted numberOfLines={1}>{r.name}{r.sector ? ` · ${r.sector}` : ""}</Muted>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{r.price != null ? (cur ? money(r.price, cur) : r.price.toFixed(4)) : "-"}</Text>
            <Text style={{ color: tone(r.chg_1d), fontSize: 12, fontWeight: "700" }}>{pct(r.chg_1d)}</Text>
          </View>
        </Row>
      </Card>
    </Pressable>
  )
}
