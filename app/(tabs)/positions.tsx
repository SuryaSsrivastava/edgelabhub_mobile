import { useEffect, useState } from "react"
import { Text, View } from "react-native"
import { api, type Account, type LivePosition } from "../../src/api"
import { ago, money, price } from "../../src/format"
import { useLoad } from "../../src/hooks"
import { colors } from "../../src/theme"
import { Card, Empty, ErrorNote, Label, Loading, Muted, Pill, Row, Screen, Title, tone } from "../../src/ui"

/** Live open positions of a connected MetaTrader account, refreshed every few seconds while this screen is open. Read only. */
export default function Positions() {
  const accounts = useLoad(() => api.accounts())
  const usable: Account[] = (accounts.data?.accounts ?? []).filter((a) => a.kind === "metaapi" || a.kind === "webhook")
  const [picked, setPicked] = useState<number | null>(null)
  useEffect(() => { if (picked === null && usable.length > 0) setPicked(usable[0].id) }, [usable, picked])
  const id = picked
  const live = useLoad(() => (id === null ? Promise.resolve(null) : api.accountLive(id)), { every: 5000, deps: [id] })
  const v = live.data

  return (
    <Screen refreshing={live.refreshing} onRefresh={live.refresh}>
      <Title sub="Updates every few seconds while you are on this screen">Positions</Title>
      {accounts.error ? <ErrorNote>{accounts.error}</ErrorNote> : null}
      {usable.length > 1 ? (
        <Row style={{ flexWrap: "wrap" }}>{usable.map((a) => <Pill key={a.id} active={a.id === picked} onPress={() => setPicked(a.id)}>{a.name}</Pill>)}</Row>
      ) : null}

      {!accounts.loaded ? <Loading /> : usable.length === 0 ? <Empty title="No MetaTrader account" text="Connect one on the website to watch your open positions here." /> : (
        <>
          {live.error ? <ErrorNote>{live.error}</ErrorNote> : null}
          {!live.loaded ? <Loading /> : v ? (
            <>
              {v.state === "starting" ? <Card><Muted>Connecting to your broker. The first look can take up to a minute.</Muted></Card> : null}
              {v.state === "error" || v.state === "unsupported" || v.state === "ended" ? <ErrorNote>{v.message || "The live view is not available for this account right now."}</ErrorNote> : null}
              {v.state === "live" ? (
                <>
                  <Card>
                    <Row style={{ justifyContent: "space-between" }}>
                      <View><Label>Equity</Label><Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>{money(v.equity, v.currency)}</Text></View>
                      <View style={{ alignItems: "flex-end" }}><Label>Floating</Label><Text style={{ color: tone(v.floating), fontSize: 22, fontWeight: "800" }}>{money(v.floating, v.currency, true)}</Text></View>
                    </Row>
                    <Muted style={{ marginTop: 6 }}>Balance {money(v.balance, v.currency)}{v.at ? ` · updated ${ago(v.at)}` : ""}</Muted>
                  </Card>
                  {(v.positions ?? []).length === 0 ? <Empty title="No open positions" text="Nothing is open on this account right now." /> : (v.positions ?? []).map((p) => <PositionCard key={p.id} p={p} currency={v.currency} />)}
                </>
              ) : null}
            </>
          ) : null}
        </>
      )}
      <Muted style={{ marginTop: 6, textAlign: "center" }}>Watching a live view keeps your broker connection open. It closes by itself soon after you leave.</Muted>
    </Screen>
  )
}

function PositionCard({ p, currency }: { p: LivePosition; currency?: string }) {
  const long = p.side === "Long"
  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <Row>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>{p.symbol}</Text>
          <View style={{ marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: `${long ? colors.green : colors.red}22` }}>
            <Text style={{ color: long ? colors.green : colors.red, fontSize: 11, fontWeight: "800" }}>{p.side.toUpperCase()}{p.volume ? ` ${p.volume}` : ""}</Text>
          </View>
        </Row>
        <Text style={{ color: tone(p.profit), fontSize: 18, fontWeight: "800" }}>{money(p.profit, currency, true)}</Text>
      </Row>
      <Row style={{ justifyContent: "space-between", marginTop: 10 }}>
        <Cell label="Open" value={price(p.open_price)} />
        <Cell label="Now" value={price(p.price)} />
        <Cell label="Stop" value={p.stop ? price(p.stop) : "-"} />
        <Cell label="Target" value={p.target ? price(p.target) : "-"} />
      </Row>
      {p.opened_at ? <Muted style={{ marginTop: 8 }}>Opened {ago(p.opened_at)}</Muted> : null}
    </Card>
  )
}

const Cell = ({ label, value }: { label: string; value: string }) => (
  <View><Label>{label}</Label><Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{value}</Text></View>
)
