import { createContext, useContext, useState, type ReactNode } from 'react'
import { startOfDay } from '@/lib/date'
import { initialTasks, nextStatus, statuses, team, type Status, type Task } from '@/data/dashboard'

const order = statuses.map((s) => s.id)
const make = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [query, setQuery] = useState('')
  const [who, setWho] = useState('semua')

  const count = (s: Status) => tasks.filter((t) => t.status === s).length
  const percent = (s: Status) => Math.round((count(s) / tasks.length) * 100)
  const load = team.map((m) => ({ ...m, n: tasks.filter((t) => t.who === m.name && t.status !== 'done').length }))
  const q = query.trim().toLowerCase()
  const visible = tasks.filter((t) => (who === 'semua' || t.who === who) && (!q || `${t.title} ${t.desc} ${t.tags.join(' ')}`.toLowerCase().includes(q)))

  const advance = (id: number) => setTasks((ts) => ts.map((t) => {
    const n = t.id === id ? nextStatus(t.status) : null
    return n ? { ...t, status: n, pct: Math.max(t.pct, statuses.find((s) => s.id === n)!.pct) } : t
  }))
  const add = (title: string, status: Status, date = startOfDay(new Date())) => setTasks((ts) => [...ts, {
    id: Date.now(), title, desc: 'Belum ada deskripsi.', tags: [], status, pct: statuses.find((s) => s.id === status)!.pct, who: 'Dewi', date, comments: 0,
  }])

  const togglePin = (id: number) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)))

  /** Terapkan urutan dan kolom hasil drag & drop. Tugas yang tersembunyi filter tetap di kolomnya. */
  const reorder = (groups: Record<string, (string | number)[]>) => setTasks((ts) => {
    const byId = new Map(ts.map((t) => [t.id, t]))
    const shown = new Set(Object.values(groups).flat())
    return order.flatMap((s) => [
      ...(groups[s] ?? []).map((id) => {
        const t = byId.get(Number(id))!
        const forward = order.indexOf(s) > order.indexOf(t.status)
        return { ...t, status: s, pct: forward ? Math.max(t.pct, statuses.find((x) => x.id === s)!.pct) : t.pct }
      }),
      ...ts.filter((t) => t.status === s && !shown.has(t.id)),
    ])
  })

  return { tasks, setTasks, visible, count, percent, load, advance, add, togglePin, reorder, query, setQuery, who, setWho }
}

const Ctx = createContext<ReturnType<typeof make> | null>(null)

/** State tugas bersama untuk Dasbor dan Papan (di memori; ganti dengan data API). */
export function TasksProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={make()}>{children}</Ctx.Provider>
}

export function useTasks() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTasks harus dipakai di dalam TasksProvider')
  return v
}
