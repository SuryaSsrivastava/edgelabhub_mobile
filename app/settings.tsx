import Constants from "expo-constants"
import { useEffect, useState } from "react"
import { Alert, Switch, Text, View } from "react-native"
import { api, apiServer } from "../src/api"
import { useAuth } from "../src/auth"
import { liveNotificationAvailable, liveNotificationEnabled, setLiveNotificationEnabled } from "../src/liveservice"
import { livePreviewAvailable, startLivePreview, stopLivePreview } from "../src/livepreview"
import { registerForPush, unregisterPush } from "../src/push"
import { colors } from "../src/theme"
import { Button, Card, ErrorNote, Label, Muted, Row, Screen } from "../src/ui"

export default function Settings() {
  const { user, signOut } = useAuth()
  const [push, setPush] = useState(true)
  const [promos, setPromos] = useState(true)
  const [live, setLive] = useState(false)
  const [liveNote, setLiveNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState<"push" | "test" | null>(null)

  useEffect(() => { api.prefs().then((p) => { setPush(p.push !== false); setPromos(p.promos !== false) }).catch(() => {}) }, [])

  const togglePush = async (on: boolean) => {
    setBusy("push"); setNote(null)
    try {
      if (on) {
        const r = await registerForPush()
        setNote({ ok: r.ok, text: r.message })
        if (!r.ok) return
      } else {
        await unregisterPush()
        setNote({ ok: true, text: "Push notifications are off for this phone." })
      }
      await api.savePrefs({ push: on })
      setPush(on)
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "Could not change that." })
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => { void liveNotificationEnabled().then(setLive) }, [])
  const toggleLive = async (on: boolean) => {
    setLiveNote(null)
    const r = await setLiveNotificationEnabled(on)
    setLiveNote({ ok: r.ok, text: r.message })
    if (r.ok) setLive(on)
  }

  const preview = async () => {
    setLiveNote(null)
    const r = await startLivePreview()
    setLiveNote({ ok: r.ok, text: r.message })
  }

  const togglePromos = async (on: boolean) => {
    setPromos(on)
    try { await api.savePrefs({ promos: on }) } catch { setPromos(!on) }
  }

  const test = async () => {
    setBusy("test"); setNote(null)
    try {
      await api.testPush()
      setNote({ ok: true, text: "Sent. It should arrive in about half a minute. If it does not, check the notification settings of your phone." })
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "Could not send the test." })
    } finally {
      setBusy(null)
    }
  }

  const out = () => Alert.alert("Sign out?", "You will stop receiving alerts on this phone.", [
    { text: "Cancel", style: "cancel" },
    { text: "Sign out", style: "destructive", onPress: () => void signOut() },
  ])

  return (
    <Screen padTop={false}>
      <Card>
        <Label>Signed in as</Label>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>{user?.name || user?.email}</Text>
        <Muted>{user?.email} · {user?.plan} plan</Muted>
      </Card>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>Push notifications</Text>
            <Muted style={{ marginTop: 3 }}>Trades opened, upcoming releases and rule warnings, on your lock screen.</Muted>
          </View>
          <Switch value={push} onValueChange={togglePush} disabled={busy === "push"} trackColor={{ true: colors.green, false: colors.border }} thumbColor="#fff" />
        </Row>
        {note ? <View style={{ marginTop: 10 }}>{note.ok ? <Muted style={{ color: colors.green }}>{note.text}</Muted> : <ErrorNote>{note.text}</ErrorNote>}</View> : null}
        <Row style={{ justifyContent: "space-between", marginTop: 14 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>Tips and offers</Text>
            <Muted style={{ marginTop: 3 }}>Occasional ideas and offers from EdgeLabHub. Turn this off and you will still get your trade and release alerts.</Muted>
          </View>
          <Switch value={promos} onValueChange={togglePromos} trackColor={{ true: colors.green, false: colors.border }} thumbColor="#fff" />
        </Row>
        <View style={{ marginTop: 12 }}><Button tone="ghost" onPress={test} busy={busy === "test"}>Send a test notification</Button></View>
      </Card>

      {liveNotificationAvailable() || livePreviewAvailable() ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>Live trades in the notification bar</Text>
          <Muted style={{ marginTop: 3 }}>While a trade is open, one notification stays in your bar with its running profit and a timer. It updates every few seconds, uses some battery, and goes away after the last trade closes.</Muted>
          {liveNotificationAvailable() ? (
            <Row style={{ justifyContent: "space-between", marginTop: 12 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>Show it when a trade is open</Text>
              <Switch value={live} onValueChange={toggleLive} trackColor={{ true: colors.green, false: colors.border }} thumbColor="#fff" />
            </Row>
          ) : <Muted style={{ marginTop: 8 }}>The real one needs a newer build of the app. You can preview how it will look.</Muted>}
          {livePreviewAvailable() ? (
            <Row style={{ gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}><Button tone="ghost" onPress={preview}>Preview</Button></View>
              <View style={{ flex: 1 }}><Button tone="ghost" onPress={() => { void stopLivePreview(); setLiveNote(null) }}>Stop preview</Button></View>
            </Row>
          ) : null}
          {liveNote ? <View style={{ marginTop: 10 }}>{liveNote.ok ? <Muted style={{ color: colors.green }}>{liveNote.text}</Muted> : <ErrorNote>{liveNote.text}</ErrorNote>}</View> : null}
        </Card>
      ) : null}

      <Card>
        <Label>About</Label>
        <Muted>EdgeLabHub mobile {Constants.expoConfig?.version}</Muted>
        {__DEV__ ? <Muted style={{ marginTop: 2 }}>Server: {apiServer()}</Muted> : null}
        <Muted style={{ marginTop: 8 }}>The app never opens a broker order. Admins can close an open trade from Live trades, after a confirmation.</Muted>
      </Card>

      <Button tone="danger" onPress={out}>Sign out</Button>
    </Screen>
  )
}
