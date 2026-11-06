import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { refreshAccessToken, setSocketId } from '@/lib/api'
import { socket } from '@/lib/socket'
import { useWorkspace } from '@/hooks/useWorkspace'

export type PresenceUser = { id: string; name: string }
type Ctx = { connected: boolean; presence: PresenceUser[]; isOnline: (userId: string) => boolean }

const Ctx = createContext<Ctx>({ connected: false, presence: [], isOnline: () => false })

const BOARD_EVENTS = ['task:created', 'task:updated', 'task:moved', 'task:deleted', 'comment:created', 'comment:updated', 'comment:deleted', 'member:added', 'member:updated', 'member:removed', 'board:updated', 'board:deleted']
const MAX_AUTH_RETRIES = 3

/** Koneksi realtime papan: tersambung selama pengguna masuk, bergabung ke room papan aktif, dan menerapkan siaran ke Workspace. */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const ws = useWorkspace()
  const wsRef = useRef(ws)
  wsRef.current = ws
  const [connected, setConnected] = useState(socket.connected)
  const [presence, setPresence] = useState<PresenceUser[]>([])
  const boardId = ws.boardId

  // Siklus koneksi
  useEffect(() => {
    let first = true
    let authRetries = 0
    const onConnect = () => {
      authRetries = 0
      setSocketId(socket.id ?? null); setConnected(true)
      if (!first) void wsRef.current.resync() // tutup celah event yang terlewat saat terputus
      first = false
    }
    const onDisconnect = (reason: string) => {
      setSocketId(null); setConnected(false); setPresence([])
      // Server memutus (mis. token kedaluwarsa): perbarui token lalu sambung lagi. Putus jaringan disambung otomatis oleh Socket.IO.
      if (reason === 'io server disconnect') void refreshAccessToken().then((t) => t && socket.connect())
    }
    const onError = (err: Error) => {
      if (err.message !== 'UNAUTHORIZED' || authRetries >= MAX_AUTH_RETRIES) return
      authRetries += 1
      void refreshAccessToken().then((t) => { if (t) setTimeout(() => socket.connect(), 300 * authRetries) })
    }
    socket.on('connect', onConnect); socket.on('disconnect', onDisconnect); socket.on('connect_error', onError)
    socket.connect()
    return () => {
      socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); socket.off('connect_error', onError)
      socket.disconnect(); setSocketId(null)
    }
  }, [])

  // Bergabung ke room papan aktif (dan bergabung ulang otomatis setelah tersambung kembali)
  useEffect(() => {
    if (!connected || !boardId) return
    let active = true
    const onPresence = (p: { boardId: string; users: PresenceUser[] }) => { if (active && p.boardId === boardId) setPresence(p.users) }
    socket.on('presence:update', onPresence)
    void socket.emitWithAck('board:join', { boardId }).then((ack: { ok: boolean; presence?: PresenceUser[] }) => {
      if (active && ack.ok && ack.presence) setPresence(ack.presence)
    }).catch(() => undefined)
    return () => {
      active = false
      socket.off('presence:update', onPresence)
      socket.emit('board:leave', { boardId })
      setPresence([])
    }
  }, [connected, boardId])

  // Terapkan siaran papan ke state Workspace
  useEffect(() => {
    const handlers = BOARD_EVENTS.map((event) => [event, (p: Record<string, unknown>) => wsRef.current.applyRealtime(event, p)] as const)
    handlers.forEach(([e, h]) => socket.on(e, h))
    return () => handlers.forEach(([e, h]) => socket.off(e, h))
  }, [])

  const value: Ctx = { connected, presence, isOnline: (id) => presence.some((u) => u.id === id) }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useRealtime = () => useContext(Ctx)
