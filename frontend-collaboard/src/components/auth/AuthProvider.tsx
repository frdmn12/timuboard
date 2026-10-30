import { useEffect, useState, type ReactNode } from 'react'
import { api, EXPIRED_EVENT, refreshAccessToken, setAccessToken } from '@/lib/api'
import { AuthContext, type AuthUser, type Ctx, type Status } from '@/hooks/useAuth'

// Petunjuk non-rahasia bahwa pernah ada sesi, agar pengunjung baru tidak memicu refresh yang pasti gagal.
const HINT = 'collaboard-session'
const hasHint = () => { try { return localStorage.getItem(HINT) === '1' } catch { return false } }
const setHint = (on: boolean) => { try { if (on) localStorage.setItem(HINT, '1'); else localStorage.removeItem(HINT) } catch { /* abaikan */ } }

/** Sesi pengguna: access token di memori, dipulihkan lewat cookie refresh saat halaman dibuka. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(() => (hasHint() ? 'loading' : 'anonymous'))
  const [user, setUser] = useState<AuthUser | null>(null)

  const startSession = (r: { accessToken: string; user: AuthUser }) => {
    setAccessToken(r.accessToken); setHint(true); setUser(r.user); setStatus('authenticated')
  }
  const clear = () => { setAccessToken(null); setHint(false); setUser(null); setStatus('anonymous') }

  useEffect(() => {
    let active = true
    if (hasHint()) refreshAccessToken()
      .then((token) => (token ? api<AuthUser>('/users/me') : null))
      .then((u) => { if (active) { setUser(u); setStatus(u ? 'authenticated' : 'anonymous'); if (!u) setHint(false) } })
      .catch(() => { if (active) clear() })
    const onExpired = () => clear()
    window.addEventListener(EXPIRED_EVENT, onExpired)
    return () => { active = false; window.removeEventListener(EXPIRED_EVENT, onExpired) }
  }, [])

  const value: Ctx = {
    status,
    user,
    login: async (email, password) => {
      const r = await api<{ accessToken: string; user: AuthUser }>('/auth/login', 'POST', { email, password })
      startSession(r)
    },
    loginWithGoogle: async (credential) => {
      const r = await api<{ accessToken: string; user: AuthUser }>('/auth/google', 'POST', { credential })
      startSession(r)
    },
    register: (name, email, password) => api('/auth/register', 'POST', { name, email, password }),
    logout: async () => {
      try { await api('/auth/logout', 'POST') } finally { clear() }
    },
    resendVerification: async (email) => { await api('/auth/resend-verification', 'POST', { email }) },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
