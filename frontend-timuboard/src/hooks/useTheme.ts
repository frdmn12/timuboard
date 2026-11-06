import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
const KEY = 'timuboard-theme'
const mq = () => matchMedia('(prefers-color-scheme: dark)')

const stored = (): ThemeMode => {
  try { const v = localStorage.getItem(KEY); if (v === 'light' || v === 'dark' || v === 'system') return v } catch { /* abaikan */ }
  return 'system'
}
const apply = (m: ThemeMode) => { document.documentElement.dataset.theme = m === 'system' ? (mq().matches ? 'dark' : 'light') : m }

/** Terapkan tema awal (pilihan tersimpan, atau mengikuti sistem) sebelum render. */
export function initTheme() { apply(stored()) }

/** Mode tema: terang, gelap, atau ikuti sistem. Disimpan di localStorage. */
export function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>(stored)
  const setMode = (m: ThemeMode) => {
    try { localStorage.setItem(KEY, m) } catch { /* abaikan */ }
    apply(m); setModeState(m)
  }
  useEffect(() => {
    if (mode !== 'system') return
    const q = mq(), on = () => apply('system')
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [mode])
  return [mode, setMode] as const
}

/** Tombol cepat terang/gelap (menetapkan pilihan eksplisit). */
export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark')
  const toggle = () => {
    const next = dark ? 'light' : 'dark'
    try { localStorage.setItem(KEY, next) } catch { /* abaikan */ }
    apply(next); setDark(!dark)
  }
  return [dark, toggle] as const
}
