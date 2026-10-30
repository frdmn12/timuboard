import { createContext, useContext } from 'react'

export type AuthUser = { id: string; name: string; email: string; emailVerified: boolean; createdAt: string }
export type Status = 'loading' | 'authenticated' | 'anonymous'
export type Ctx = {
  status: Status
  user: AuthUser | null
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<{ verificationEmailSent: boolean }>
  logout: () => Promise<void>
  resendVerification: (email: string) => Promise<void>
}

export const AuthContext = createContext<Ctx | null>(null)

export function useAuth() {
  const v = useContext(AuthContext)
  if (!v) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return v
}
