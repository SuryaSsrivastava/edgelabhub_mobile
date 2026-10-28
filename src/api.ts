import * as SecureStore from "expo-secure-store"
import { DEFAULT_API_URL } from "./config"

// ---- types: the parts of the EdgeLabHub API this app reads --------------------------------------------------------------------------------------------------------------------

export type User = { id: number; email: string; name: string; timezone: string; plan: string; is_admin: boolean }
export type Notice = { id: number; kind: string; title: string; body: string; link: string; read: boolean; created_at: string }
export type Account = {
  id: number; name: string; kind: string; broker?: string | null; server?: string | null; is_prop: boolean; status: "active" | "connecting" | "error" | "paused"
  hint: string; prop: { balance: number; equity: number; today: number } | null
}
export type LivePosition = { id: string; symbol: string; side: "Long" | "Short"; volume: number | null; open_price: number | null; price: number | null; stop: number | null; target: number | null; profit: number; swap: number | null; opened_at: string | null }
export type LiveView = { state: "starting" | "live" | "error" | "unsupported" | "ended"; message?: string; positions?: LivePosition[]; balance?: number | null; equity?: number | null; currency?: string; floating?: number; at?: string }
export type ForwardStats = { n: number; wins: number; winRate: number; expectancy: number; profitFactor: number | null; totalR: number; maxDrawdownR: number }
export type Forward = { id: number; name: string; symbol: string; timeframe: string; status: "active" | "stopped"; started_at: string; evaluated_at: string | null; stats: ForwardStats | null; max_trades: number | null }
export type ForwardTrade = { id: number; side: "long" | "short"; entry: number; stop: number; target: number; exit?: number | null; r_multiple?: number | null; entry_at: string; exit_at?: string | null; exit_reason?: string | null }
export type ForwardFull = Forward & { result: { closed: ForwardTrade[]; open: ForwardTrade[]; stats: ForwardStats } | null }
export type EconEvent = { id: string; series: string; time: string; country: string; currency: string; name: string; importance: "high" | "medium" | "low"; actual: string; forecast: string; previous: string; above_forecast: boolean | null }
export type NewsAlerts = { enabled: boolean; currencies: string[]; lead_minutes: number; events: string[] }
export type Prefs = { push: boolean; promos?: boolean; [k: string]: unknown }

// ---- the connection -----------------------------------------------------------------------------------------------------------------------------------------------------------

const TOKEN_KEY = "edgelab.token"
const SERVER_KEY = "edgelab.server"

let token: string | null = null
let server: string = DEFAULT_API_URL
let onUnauthorized: () => void = () => {}

export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }
export const apiServer = () => server

export async function restoreSession(): Promise<boolean> {
  try {
    token = await SecureStore.getItemAsync(TOKEN_KEY)
    server = (await SecureStore.getItemAsync(SERVER_KEY)) || DEFAULT_API_URL
  } catch { token = null }
  return !!token
}

export async function saveServer(url: string) {
  server = url.trim().replace(/\/+$/, "") || DEFAULT_API_URL
  try { await SecureStore.setItemAsync(SERVER_KEY, server) } catch { /* keep it for this run */ }
}

export async function forgetSession() {
  token = null
  try { await SecureStore.deleteItemAsync(TOKEN_KEY) } catch { /* nothing stored */ }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", "X-EdgeLab-Client": "mobile", ...(init.headers as Record<string, string> | undefined) }
  if (init.body) headers["Content-Type"] = "application/json"
  if (auth && token) headers.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(`${server}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, "Can't reach EdgeLabHub. Check your connection.")
  }
  if (res.status === 401 && auth) { onUnauthorized(); throw new ApiError(401, "Your session ended. Sign in again.") }
  if (!res.ok) {
    let detail = `Something went wrong (${res.status}).`
    try { const j = await res.json(); if (typeof j.detail === "string") detail = j.detail } catch { /* not JSON */ }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function login(email: string, password: string): Promise<User> {
  const r = await request<{ user: User; access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) }, false)
  token = r.access_token
  await SecureStore.setItemAsync(TOKEN_KEY, token)
  return r.user
}

export const api = {
  me: () => request<User>("/auth/me"),
  notices: (limit = 40) => request<{ items: Notice[]; unread: number }>(`/notifications?limit=${limit}`),
  readNotice: (id: number) => request<void>(`/notifications/${id}/read`, { method: "POST" }),
  readAll: () => request<void>("/notifications/read-all", { method: "POST" }),
  clearNotices: () => request<void>("/notifications", { method: "DELETE" }),
  prefs: () => request<Prefs>("/notifications/prefs"),
  savePrefs: (b: Partial<Prefs>) => request<Prefs>("/notifications/prefs", { method: "PUT", body: JSON.stringify(b) }),
  registerDevice: (tokenValue: string, platform: string, name: string) => request<void>("/notifications/devices", { method: "POST", body: JSON.stringify({ token: tokenValue, platform, name }) }),
  unregisterDevice: (tokenValue: string) => request<void>(`/notifications/devices?token=${encodeURIComponent(tokenValue)}`, { method: "DELETE" }),
  testPush: () => request<void>("/notifications/devices/test", { method: "POST" }),
  accounts: () => request<{ accounts: Account[] }>("/accounts"),
  accountLive: (id: number) => request<LiveView>(`/accounts/${id}/live`),
  forwardTests: () => request<Forward[]>("/forward"),
  forwardTest: (id: number) => request<ForwardFull>(`/forward/${id}`),
  calendar: (importance: string, countries: string[]) =>
    request<{ events: EconEvent[]; available: boolean }>(`/market/economic-calendar?importance=${importance}&countries=${encodeURIComponent(countries.join(","))}&back=1&ahead=7`),
  newsAlerts: () => request<NewsAlerts>("/notifications/news-alerts"),
  saveNewsAlerts: (b: NewsAlerts) => request<NewsAlerts>("/notifications/news-alerts", { method: "PUT", body: JSON.stringify(b) }),
}
