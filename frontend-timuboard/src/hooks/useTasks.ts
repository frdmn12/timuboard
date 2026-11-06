import { useState } from 'react'
import type { Status } from '@/data/dashboard'
import { tintOf } from '@/data/dashboard'
import { useWorkspace } from '@/hooks/useWorkspace'

/** Tugas papan aktif + penyaringan lokal (pencarian dan orang) + turunan statistik. */
export function useTasks() {
  const ws = useWorkspace()
  const [query, setQuery] = useState('')
  const [who, setWho] = useState('semua') // 'semua' atau userId anggota

  const count = (s: Status) => ws.tasks.filter((t) => t.status === s).length
  const percent = (s: Status) => (ws.tasks.length ? Math.round((count(s) / ws.tasks.length) * 100) : 0)
  const load = ws.members.map((m) => ({ id: m.userId, name: m.name, tint: tintOf(m.name), n: ws.tasks.filter((t) => t.assigneeId === m.userId && t.status !== 'done').length }))
  const q = query.trim().toLowerCase()
  const visible = ws.tasks.filter((t) => (who === 'semua' || t.assigneeId === who) && (!q || `${t.title} ${t.desc} ${t.tags.join(' ')}`.toLowerCase().includes(q)))

  return { ...ws, visible, count, percent, load, query, setQuery, who, setWho }
}
