import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { api, forgetSession, login as apiLogin, restoreSession, setUnauthorizedHandler, type User } from "./api"
import { unregisterPush } from "./push"

type AuthState = { user: User | null; ready: boolean; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void> }
const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  const clear = useCallback(() => { void forgetSession(); setUser(null) }, [])

  useEffect(() => {
    setUnauthorizedHandler(clear)
    ;(async () => {
      if (await restoreSession()) {
        try { setUser(await api.me()) } catch { /* a 401 already cleared it; a network error leaves the phone on the sign-in screen */ }
      }
      setReady(true)
    })()
  }, [clear])

  const signIn = useCallback(async (email: string, password: string) => { setUser(await apiLogin(email, password)) }, [])
  const signOut = useCallback(async () => {
    await unregisterPush() // stop notifications to this phone before the session goes
    clear()
  }, [clear])

  const value = useMemo(() => ({ user, ready, signIn, signOut }), [user, ready, signIn, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>")
  return c
}
