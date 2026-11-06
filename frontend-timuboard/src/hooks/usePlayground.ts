import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { BASE } from '@/lib/api'
import { tt, type Txt } from '@/lib/i18n'
import { demoColumns, demoTasks, deviceTz, type DemoStatus, type ReactionKind } from '@/data/playground'

export type Guest = { id: string; name: string; tz: string | null }
/** Disimpan sebagai pasangan [id, en] agar ikut berganti saat bahasa diganti. */
export type Activity = { key: number; text: Txt }
export type Reaction = { key: number; kind: ReactionKind; name: string }
type Welcome = { self: Guest; room: number; members: Guest[]; board: Record<string, DemoStatus>; total: number }

const NAME_KEY = 'playground:name'
const LOCATION_KEY = 'playground:location'
const MAX_ACTIVITY = 6
const REACTION_MS = 2400

const read = (k: string) => { try { return localStorage.getItem(k) ?? '' } catch { return '' } }
const save = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* mode privat: abaikan */ } }
const titleOf = (id: string): Txt => demoTasks.find((t) => t.id === id)?.title ?? ['kartu', 'a card']
const columnOf = (s: DemoStatus) => demoColumns.find((c) => c.id === s)?.name ?? s

/** Koneksi tamu ke namespace /playground: presence ruang, jumlah online global, papan demo, dan reaksi. */
export function usePlayground() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline' | 'full'>('connecting')
  const [self, setSelf] = useState<Guest | null>(null)
  const [room, setRoom] = useState(0)
  const [members, setMembers] = useState<Map<string, Guest>>(new Map())
  const [total, setTotal] = useState(0)
  const [board, setBoard] = useState<Record<string, DemoStatus>>({})
  const [activity, setActivity] = useState<Activity[]>([])
  const [floating, setFloating] = useState<Reaction[]>([])
  const nameRef = useRef(read(NAME_KEY))
  // Lokasi opt-in: mati sampai tamu menyalakannya; pilihan diingat di browser ini.
  const [sharing, setSharing] = useState(() => read(LOCATION_KEY) === '1' && deviceTz() !== null)
  const tzRef = useRef(sharing ? deviceTz() : null)
  const seq = useRef(0)

  const log = (text: Txt) => setActivity((a) => [{ key: ++seq.current, text }, ...a].slice(0, MAX_ACTIVITY))
  const float = (kind: ReactionKind, name: string) => {
    const key = ++seq.current
    setFloating((f) => [...f, { key, kind, name }])
    setTimeout(() => setFloating((f) => f.filter((r) => r.key !== key)), REACTION_MS)
  }

  useEffect(() => {
    // forceNew: io() memakai ulang Manager per origin; Manager milik lib/socket.ts dibuat dengan autoConnect:false,
    // jadi tanpa ini socket /playground ikut tidak pernah tersambung.
    const s = io(`${BASE}/playground`, { forceNew: true, transports: ['websocket'], auth: (cb) => cb({ name: nameRef.current, tz: tzRef.current }) })
    const put = (g: Guest) => setMembers((m) => new Map(m).set(g.id, g))
    s.on('welcome', (w: Welcome) => {
      setSelf(w.self); setRoom(w.room); setBoard(w.board); setTotal(w.total); setStatus('online')
      setMembers(new Map(w.members.map((g) => [g.id, g])))
    })
    s.on('presence:join', (g: Guest) => { put(g); log([`${g.name} masuk`, `${g.name} joined`]) })
    s.on('presence:update', put)
    s.on('presence:leave', (g: Guest) => {
      log([`${g.name} keluar`, `${g.name} left`])
      setMembers((m) => { const n = new Map(m); n.delete(g.id); return n })
    })
    s.on('online', ({ total }: { total: number }) => setTotal(total))
    s.on('task:moved', ({ taskId, status, by }: { taskId: string; status: DemoStatus; by: string }) => {
      setBoard((b) => ({ ...b, [taskId]: status }))
      log([`${by} memindahkan "${titleOf(taskId)[0]}" ke ${columnOf(status)}`, `${by} moved "${titleOf(taskId)[1]}" to ${columnOf(status)}`])
    })
    s.on('react', ({ kind, name }: { kind: ReactionKind; name: string }) => float(kind, name))
    s.on('disconnect', () => setStatus('offline'))
    s.on('connect_error', (e) => setStatus(e.message === 'TOO_MANY_CONNECTIONS' ? 'full' : 'offline'))
    setSocket(s)
    return () => { s.disconnect(); setSocket(null) }
  }, [])

  const rename = async (name: string) => {
    if (!socket) return false
    const ack = (await socket.timeout(3000).emitWithAck('rename', { name }).catch(() => null)) as { ok: boolean; name?: string } | null
    if (!ack?.ok || !ack.name) return false
    nameRef.current = ack.name
    save(NAME_KEY, ack.name)
    setSelf((me) => me && { ...me, name: ack.name! })
    setMembers((m) => { const me = self && m.get(self.id); return me ? new Map(m).set(me.id, { ...me, name: ack.name! }) : m })
    return true
  }

  const shareLocation = async (on: boolean) => {
    const tz = on ? deviceTz() : null
    if (!socket || (on && !tz)) return false
    const ack = (await socket.timeout(3000).emitWithAck('location', { tz }).catch(() => null)) as { ok: boolean } | null
    if (!ack?.ok) return false
    tzRef.current = tz
    save(LOCATION_KEY, on ? '1' : '0')
    setSharing(on)
    if (self) setMembers((m) => { const me = m.get(self.id); return me ? new Map(m).set(me.id, { ...me, tz }) : m })
    return true
  }

  const moveTask = (taskId: string, to: DemoStatus) => {
    if (!socket || board[taskId] === to) return
    setBoard((b) => ({ ...b, [taskId]: to }))
    socket.emit('task:move', { taskId, status: to })
  }

  const react = (kind: ReactionKind) => {
    socket?.volatile.emit('react', { kind })
    float(kind, self?.name ?? tt('Kamu', 'You'))
  }

  // Total global datang per 2 detik; jangan sampai lebih kecil dari isi ruang yang terlihat.
  return { socket, status, self, room, members: [...members.values()], total: Math.max(total, members.size), board, activity, floating, rename, moveTask, react, sharing, shareLocation }
}
