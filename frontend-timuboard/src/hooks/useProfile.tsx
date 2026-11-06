import { createContext, useContext, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'

export type Profile = { name: string; email: string; role: string }
const KEY = 'timuboard-role'
const loadRole = () => { try { return localStorage.getItem(KEY) ?? 'Desainer' } catch { return 'Desainer' } }

const Ctx = createContext<{ profile: Profile; saveRole: (role: string) => void } | null>(null)

/** Profil pengguna: nama dan email dari akun yang masuk; peran masih disimpan lokal (belum ada API). */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [role, setRole] = useState(loadRole)
  const saveRole = (r: string) => {
    setRole(r)
    try { localStorage.setItem(KEY, r) } catch { /* abaikan */ }
  }
  const profile: Profile = { name: user?.name ?? '', email: user?.email ?? '', role }
  return <Ctx.Provider value={{ profile, saveRole }}>{children}</Ctx.Provider>
}

export function useProfile() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useProfile harus dipakai di dalam ProfileProvider')
  return v
}
