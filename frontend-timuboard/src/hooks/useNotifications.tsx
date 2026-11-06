import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { socket } from '@/lib/socket'
import { errorMessage } from '@/lib/errors'
import type { AppNotification, NotificationPage } from '@/data/notifications'

export type NotificationFilter = 'all' | 'unread'
type Load = 'idle' | 'loading' | 'ready' | 'error'
const POLL_MS = 30_000
const PAGE = 20

function useNotificationState() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<AppNotification[]>([])
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [load, setLoad] = useState<Load>('idle')
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilterState] = useState<NotificationFilter>('all')
  const [actionError, setActionError] = useState<string | null>(null)
  const itemsRef = useRef<AppNotification[]>([])
  const filterRef = useRef<NotificationFilter>('all')
  const seq = useRef(0)

  const setList = useCallback((next: AppNotification[]) => { itemsRef.current = next; setItems(next) }, [])
  const refreshCount = useCallback(async () => {
    try { setUnreadCount((await api<{ count: number }>('/notifications/unread-count')).count) } catch { /* polling berikutnya mencoba lagi */ }
  }, [])

  /** Muat halaman pertama (terbaru) sesuai filter; respons yang basi diabaikan. */
  const refresh = useCallback(async (f: NotificationFilter = filterRef.current, silent = false) => {
    const id = ++seq.current
    if (!silent) setLoad('loading')
    try {
      const page = await api<NotificationPage>(`/notifications?limit=${PAGE}${f === 'unread' ? '&unread=true' : ''}`)
      if (id !== seq.current) return
      setList(page.items); setNextBefore(page.nextBefore); setUnreadCount(page.unreadCount); setLoad('ready'); setActionError(null)
    } catch {
      if (id === seq.current && !silent) setLoad('error')
    }
  }, [setList])

  useEffect(() => {
    void refreshCount()
    // Polling hanya cadangan saat realtime terputus; saat tersambung, server mendorong `notification:new`.
    const tick = () => { if (document.visibilityState === 'visible' && !socket.connected) void refreshCount() }
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshCount() }
    const onNew = () => { void refreshCount(); if (itemsRef.current.length) void refresh(filterRef.current, true) }
    const timer = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', onVisible)
    socket.on('notification:new', onNew)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); socket.off('notification:new', onNew) }
  }, [refreshCount, refresh])

  const setFilter = (f: NotificationFilter) => { filterRef.current = f; setFilterState(f); void refresh(f) }

  const loadOlder = async () => {
    if (!nextBefore || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await api<NotificationPage>(`/notifications?limit=${PAGE}&before=${encodeURIComponent(nextBefore)}${filterRef.current === 'unread' ? '&unread=true' : ''}`)
      const seen = new Set(itemsRef.current.map((n) => n.id))
      setList([...itemsRef.current, ...page.items.filter((n) => !seen.has(n.id))])
      setNextBefore(page.nextBefore); setUnreadCount(page.unreadCount)
    } catch (err) { setActionError(errorMessage(err)) } finally { setLoadingMore(false) }
  }

  const markRead = async (id: string) => {
    const before = itemsRef.current
    const target = before.find((n) => n.id === id)
    if (!target || target.read) return
    setList(before.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
    try { await api(`/notifications/${id}/read`, 'POST') } catch (err) {
      setList(itemsRef.current.map((n) => (n.id === id ? { ...n, read: false } : n)))
      setActionError(errorMessage(err))
    }
    void refreshCount()
  }

  const markAllRead = async () => {
    const before = itemsRef.current
    setList(before.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try { await api('/notifications/read-all', 'POST') } catch (err) {
      setList(itemsRef.current.map((n) => (before.find((b) => b.id === n.id)?.read === false ? { ...n, read: false } : n)))
      setActionError(errorMessage(err))
    }
    void refreshCount()
  }

  return { unreadCount, items, nextBefore, load, loadingMore, filter, actionError, setFilter, refresh, loadOlder, markRead, markAllRead, dismissError: () => setActionError(null) }
}

const Ctx = createContext<ReturnType<typeof useNotificationState> | null>(null)

/** Notifikasi dalam aplikasi: hitungan belum dibaca (polling 30 detik), daftar, dan aksi baca. */
export function NotificationProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useNotificationState()}>{children}</Ctx.Provider>
}

export function useNotifications() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useNotifications harus dipakai di dalam NotificationProvider')
  return v
}
