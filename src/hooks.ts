import { useFocusEffect } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { AppState } from "react-native"
import { ApiError } from "./api"

/**
 * Load something from the API when a screen opens, let the member pull to refresh, and (optionally) keep it fresh while the screen is in front and the app is open.
 * Nothing is requested while the app is in the background.
 */
export function useLoad<T>(fetcher: () => Promise<T>, opts: { every?: number; deps?: unknown[] } = {}) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const fetchRef = useRef(fetcher)
  fetchRef.current = fetcher
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const run = useCallback(async () => {
    try {
      const d = await fetchRef.current()
      if (alive.current) { setData(d); setError(null) }
    } catch (e) {
      if (alive.current && !(e instanceof ApiError && e.status === 401)) setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      if (alive.current) setLoaded(true)
    }
  }, [])

  const depKey = JSON.stringify(opts.deps ?? [])
  useFocusEffect(useCallback(() => {
    void run()
    if (!opts.every) return
    const t = setInterval(() => { if (AppState.currentState === "active") void run() }, opts.every)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, opts.every, depKey]))

  const refresh = useCallback(async () => { setRefreshing(true); await run(); setRefreshing(false) }, [run])
  return { data, error, loaded, refreshing, refresh, reload: run }
}
