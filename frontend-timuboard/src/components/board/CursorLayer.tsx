import { useEffect, useState, type RefObject } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWorkspace } from '@/hooks/useWorkspace'
import CursorTag from '@/components/common/CursorTag'
import { socket } from '@/lib/socket'

type Cursor = { socketId: string; userId: string; name: string; x: number; y: number; at: number }
type MovePayload = Omit<Cursor, 'at'> & { boardId: string }

const IDLE_MS = 6000

/** Kursor anggota lain di atas area papan. Dihapus saat dia keluar, terputus, atau diam lebih dari 6 detik. */
export default function CursorLayer({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const { boardId } = useWorkspace()
  const { user } = useAuth()
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map())
  const [width, setWidth] = useState(0)

  // Lebar konten (termasuk bagian yang tergulir) untuk mengubah x (pecahan) menjadi piksel
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setWidth(el.scrollWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef])

  useEffect(() => {
    setCursors(new Map())
    const onMove = (p: MovePayload) => {
      if (p.boardId !== boardId || p.userId === user?.id) return // kursor tab lain milik sendiri tidak ditampilkan
      setCursors((cur) => new Map(cur).set(p.socketId, { socketId: p.socketId, userId: p.userId, name: p.name, x: p.x, y: p.y, at: Date.now() }))
    }
    const onHide = (p: { socketId: string }) => setCursors((cur) => {
      if (!cur.has(p.socketId)) return cur
      const next = new Map(cur)
      next.delete(p.socketId)
      return next
    })
    const sweep = setInterval(() => setCursors((cur) => {
      const now = Date.now()
      const next = new Map([...cur].filter(([, c]) => now - c.at < IDLE_MS))
      return next.size === cur.size ? cur : next
    }), 1000)
    const onDisconnect = () => setCursors(new Map())
    socket.on('cursor:move', onMove); socket.on('cursor:hide', onHide); socket.on('disconnect', onDisconnect)
    return () => { clearInterval(sweep); socket.off('cursor:move', onMove); socket.off('cursor:hide', onHide); socket.off('disconnect', onDisconnect) }
  }, [boardId, user?.id])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute top-0 left-0 z-30">
      {[...cursors.values()].map((c) => (
        <CursorTag key={c.socketId} name={c.name} x={c.x * width} y={c.y} />
      ))}
    </div>
  )
}
