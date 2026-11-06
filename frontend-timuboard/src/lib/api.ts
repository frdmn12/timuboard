export const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  status: number
  code: string
  details: unknown

  constructor(status: number, code: string, message: string, details: unknown = null) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

type Envelope<T> = { success: true; data: T } | { success: false; error: { code: string; message: string; details: unknown } }

// Access token hanya di memori (bukan localStorage); refresh token ada di cookie httpOnly.
let accessToken: string | null = null
export const setAccessToken = (t: string | null) => { accessToken = t }
export const getAccessToken = () => accessToken

// Id socket aktif dikirim sebagai X-Socket-Id agar server tidak memantulkan siaran ke pelaku (tab lain tetap menerima).
let socketId: string | null = null
export const setSocketId = (id: string | null) => { socketId = id }
export const EXPIRED_EVENT = 'auth:expired'

async function request<T>(path: string, method: string, body?: unknown, token = accessToken): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }), ...(socketId && { 'X-Socket-Id': socketId }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Tidak dapat terhubung ke server.')
  }
  if (res.status === 204) return undefined as T // tanpa isi (mis. DELETE)
  const json = (await res.json().catch(() => null)) as Envelope<T> | null
  if (res.ok && json?.success) return json.data
  const err = json && !json.success ? json.error : null
  throw new ApiError(res.status, err?.code ?? 'ERROR', err?.message ?? 'Terjadi kesalahan.', err?.details ?? null)
}

// Satu refresh pada satu waktu: refresh token berotasi, jadi dua permintaan bersamaan akan saling membatalkan.
let refreshing: Promise<string | null> | null = null
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= request<{ accessToken: string }>('/auth/refresh', 'POST', undefined, null)
    .then((r) => { accessToken = r.accessToken; return accessToken })
    .catch(() => { accessToken = null; return null })
    .finally(() => { refreshing = null })
  return refreshing
}

/** Panggilan API; pada 401 mencoba refresh sekali lalu mengulang. */
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  try {
    return await request<T>(path, method, body)
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401 || path.startsWith('/auth/')) throw err
    const token = await refreshAccessToken()
    if (!token) {
      window.dispatchEvent(new Event(EXPIRED_EVENT))
      throw err
    }
    return request<T>(path, method, body, token)
  }
}
