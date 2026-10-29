import { useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { apiServer, saveServer, validServer } from "../src/api"
import { useAuth } from "../src/auth"
import { colors, radius } from "../src/theme"
import { Button, ErrorNote } from "../src/ui"

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [advanced, setAdvanced] = useState(false)
  const [server, setServer] = useState(apiServer())

  const submit = async () => {
    if (!email.trim() || !password) { setError("Enter your email and password."); return }
    setBusy(true); setError(null)
    try {
      if (advanced) {
        if (!validServer(server)) { setError("The server must be a full address, like https://edgelabhub.com/api/v1"); return }
        await saveServer(server)
      }
      await signIn(email, password)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.wrap}>
        <Text style={s.brand}>EDGELABHUB</Text>
        <Text style={s.h1}>Your alerts and live positions, in your pocket.</Text>
        <Text style={s.p}>Sign in with the account you use on the website.</Text>
        <View style={{ height: 22 }} />
        {error ? <ErrorNote>{error}</ErrorNote> : null}
        <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" style={s.input} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.muted} secureTextEntry textContentType="password" onSubmitEditing={submit} returnKeyType="go" style={s.input} />
        <Button onPress={submit} busy={busy}>Sign in</Button>
        <Text style={[s.p, { marginTop: 16, fontSize: 12 }]}>Signed up with Google? Set a password under Profile on the website first, then sign in here.</Text>
        <Pressable onPress={() => setAdvanced((v) => !v)} style={{ marginTop: 22 }}><Text style={{ color: colors.muted, fontSize: 12 }}>{advanced ? "Hide" : "Advanced"}</Text></Pressable>
        {advanced ? (
          <View style={{ marginTop: 8 }}>
            <Text style={[s.p, { fontSize: 11, marginBottom: 6 }]}>Server (ends in /api/v1)</Text>
            <TextInput value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={s.input} />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  brand: { color: colors.green, fontSize: 12, fontWeight: "800", letterSpacing: 4, marginBottom: 14 },
  h1: { color: colors.text, fontSize: 30, fontWeight: "800", letterSpacing: -0.6, lineHeight: 34 },
  p: { color: colors.muted, fontSize: 14, marginTop: 8 },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, color: colors.text, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, marginBottom: 12 },
})
