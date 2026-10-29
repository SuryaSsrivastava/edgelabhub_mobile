import { Ionicons } from "@expo/vector-icons"
import { useEffect, useMemo, useState } from "react"
import { Pressable, Text, TextInput, View } from "react-native"
import { api, type Goals, type Rules } from "../src/api"
import { Rise } from "../src/fx"
import { useLoad } from "../src/hooks"
import { colors, radius } from "../src/theme"
import { Button, Card, ErrorNote, Field, Label, Loading, Muted, Pill, Row, Screen, Title } from "../src/ui"

type Draft = Record<keyof Goals, string>
const LIMITS: { key: keyof Goals; label: string; hint: string; whole?: boolean }[] = [
  { key: "max_trades_day", label: "Most trades in a day", hint: "e.g. 5", whole: true },
  { key: "max_daily_loss", label: "Daily loss limit", hint: "Stop for the day at this loss, in your account currency" },
  { key: "max_losses_in_row", label: "Most losses in a row", hint: "e.g. 3: then stop", whole: true },
]
const GOALS: { key: keyof Goals; label: string; hint: string }[] = [
  { key: "daily_goal", label: "Daily profit goal", hint: "Profit to reach in a day" },
  { key: "monthly_goal", label: "Monthly profit goal", hint: "Profit to reach in a month" },
  { key: "profit_target", label: "Total profit target", hint: "Total profit to reach, for example a prop-firm target" },
]
const KEYS = [...LIMITS, ...GOALS].map((f) => f.key)
const toDraft = (g?: Partial<Goals> | null): Draft => Object.fromEntries(KEYS.map((k) => [k, g?.[k] != null ? String(g[k]) : ""])) as Draft

export default function GoalsScreen() {
  const rules = useLoad(() => api.rules())
  const accounts = useLoad(() => api.accounts())
  const list = accounts.data?.accounts ?? []
  const [scope, setScope] = useState<"default" | number>("default")
  const [draft, setDraft] = useState<Draft>(toDraft(null))
  const [checklist, setChecklist] = useState<string[]>([])
  const [item, setItem] = useState("")
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)

  const account = scope === "default" ? null : list.find((a) => a.id === scope) ?? null
  const source = scope === "default" ? rules.data : account?.goals
  // load the chosen set into the form: when it is chosen, and once its data has arrived
  useEffect(() => {
    if (scope === "default" ? !rules.loaded : !account) return
    setDraft(toDraft(source)); setChecklist(scope === "default" ? rules.data?.checklist ?? [] : []); setNote(null)
  }, [scope, rules.loaded, accounts.loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const changed = useMemo(() => {
    const a = toDraft(source)
    return KEYS.some((k) => a[k] !== draft[k].trim()) || (scope === "default" && JSON.stringify(rules.data?.checklist ?? []) !== JSON.stringify(checklist))
  }, [draft, checklist, source, scope, rules.data])

  const save = async () => {
    const out = {} as Goals
    for (const f of [...LIMITS, ...GOALS]) {
      const raw = draft[f.key].trim()
      if (raw === "") { out[f.key] = null; continue }
      const n = Number(raw.replace(",", "."))
      if (!Number.isFinite(n) || n <= 0) return setNote({ ok: false, text: `${f.label}: use a number above zero, or leave it empty to switch it off.` })
      if ("whole" in f && f.whole && !Number.isInteger(n)) return setNote({ ok: false, text: `${f.label}: use a whole number.` })
      if (f.key === "max_trades_day" && n > 200) return setNote({ ok: false, text: `${f.label}: at most 200.` })
      if (f.key === "max_losses_in_row" && n > 50) return setNote({ ok: false, text: `${f.label}: at most 50.` })
      if (n > 1_000_000_000) return setNote({ ok: false, text: `${f.label}: that number is too large.` })
      out[f.key] = n
    }
    setBusy(true); setNote(null)
    try {
      if (scope === "default") await api.saveRules({ ...out, checklist })
      else await api.saveAccountGoals(scope, out)
      await Promise.all([rules.refresh(), accounts.refresh()])
      setDraft(toDraft(out))  // show the numbers as saved ("250.50" becomes 250.5)
      setNote({ ok: true, text: "Saved. Your guard rails on Home now follow these." })
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "Could not save." })
    } finally {
      setBusy(false)
    }
  }

  const add = () => {
    const t = item.trim()
    if (!t) return
    if (t.length > 80) return setNote({ ok: false, text: "Keep each checklist item under 80 characters." })
    if (checklist.length >= 8) return setNote({ ok: false, text: "A checklist can hold 8 items." })
    if (!checklist.includes(t)) setChecklist([...checklist, t])
    setItem(""); setNote(null)
  }
  const numField = (f: { key: keyof Goals; label: string; hint: string }) => (
    <Field key={f.key} label={f.label} value={draft[f.key]} onChangeText={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} keyboardType="decimal-pad" placeholder="Off" />
  )

  return (
    <Screen padTop={false} refreshing={rules.refreshing} onRefresh={() => { void rules.refresh(); void accounts.refresh() }}>
      <Title sub="You are alerted when you cross a limit or reach a goal. Leave a box empty to switch it off.">Goals and limits</Title>

      {!rules.loaded ? <Loading /> : (
        <>
          {list.length > 0 ? (
            <Rise>
              <Label>Applies to</Label>
              <Row style={{ flexWrap: "wrap" }}>
                <Pill active={scope === "default"} onPress={() => setScope("default")}>{list.length > 0 ? "Other trades" : "All trades"}</Pill>
                {list.map((a) => <Pill key={a.id} active={scope === a.id} onPress={() => setScope(a.id)} color={colors.blue}>{a.name}</Pill>)}
              </Row>
              <Muted style={{ marginVertical: 6 }}>{scope === "default" ? "These apply to every trade that is not on an account with goals of its own." : `These apply only to trades on ${account?.name ?? "this account"}.`}</Muted>
            </Rise>
          ) : null}

          {rules.error ? <ErrorNote>{rules.error}</ErrorNote> : null}
          {note ? <View style={{ marginVertical: 8 }}>{note.ok ? <Text style={{ color: colors.green, fontSize: 13, fontWeight: "700" }}>{note.text}</Text> : <ErrorNote>{note.text}</ErrorNote>}</View> : null}

          <Card delay={60}>
            <Row style={{ marginBottom: 10 }}><Ionicons name="shield-checkmark-outline" size={18} color={colors.green} /><Text style={{ color: colors.text, fontSize: 15, fontWeight: "800", marginLeft: 8 }}>Limits</Text></Row>
            {LIMITS.map(numField)}
          </Card>

          <Card delay={120}>
            <Row style={{ marginBottom: 10 }}><Ionicons name="trophy-outline" size={18} color={colors.blue} /><Text style={{ color: colors.text, fontSize: 15, fontWeight: "800", marginLeft: 8 }}>Goals</Text></Row>
            {GOALS.map(numField)}
          </Card>

          {scope === "default" ? (
            <Card delay={180}>
              <Row style={{ marginBottom: 4 }}><Ionicons name="checkbox-outline" size={18} color={colors.amber} /><Text style={{ color: colors.text, fontSize: 15, fontWeight: "800", marginLeft: 8 }}>Pre-trade checklist</Text></Row>
              <Muted style={{ marginBottom: 10 }}>Up to 8 things to check before every trade, such as "Stop loss set" or "Checked the news".</Muted>
              {checklist.map((c, i) => (
                <Row key={c} style={{ justifyContent: "space-between", paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: `${colors.border}99` }}>
                  <Text style={{ color: colors.text, fontSize: 14, flex: 1, paddingRight: 10 }}>{c}</Text>
                  <Pressable onPress={() => setChecklist(checklist.filter((x) => x !== c))} hitSlop={10}><Ionicons name="close-circle" size={20} color={colors.muted} /></Pressable>
                </Row>
              ))}
              <Row style={{ gap: 8, marginTop: 10 }}>
                <TextInput value={item} onChangeText={setItem} onSubmitEditing={add} returnKeyType="done" placeholder="Add an item" placeholderTextColor={colors.muted} maxLength={80} style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, fontSize: 15 }} />
                <Pressable onPress={add} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.green}22`, borderWidth: 1, borderColor: colors.green, alignItems: "center", justifyContent: "center" }}><Ionicons name="add" size={22} color={colors.green} /></Pressable>
              </Row>
            </Card>
          ) : null}

          <Button onPress={save} busy={busy} disabled={!changed}>Save</Button>
        </>
      )}
    </Screen>
  )
}
