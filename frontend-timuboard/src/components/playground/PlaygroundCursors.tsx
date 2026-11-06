import { useEffect, useState, type RefObject } from 'react'
import type { Socket } from 'socket.io-client'
import CursorTag from '@/components/common/CursorTag'

type Cursor = { id: string; name: string; x: number; y: number; at: number }
const IDLE_MS = 6000

/** Kursor tamu lain di ruang yang sama. State sendiri agar 20 pesan/detik tidak me-render ulang seluruh laman. */
export default function PlaygroundCursors({ socket, containerRef }: { socket: Socket; containerRef: RefObject<HTMLElement | null> }) {
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map())
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.scrollWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef])

  useEffect(() => {
    const drop = ({ id }: { id: string }) => setCursors((cur) => {
      if (!cur.has(id)) return cur
      const next = new Map(cur)
      next.delete(id)
      return next
    })
    const onMove = (c: Omit<Cursor, 'at'>) => setCursors((cur) => new Map(cur).set(c.id, { ...c, at: Date.now() }))
    const clear = () => setCursors(new Map())
    const sweep = setInterval(() => setCursors((cur) => {
      const now = Date.now()
      const next = new Map([...cur].filter(([, c]) => now - c.at < IDLE_MS))
      return next.size === cur.size ? cur : next
    }), 1000)
    socket.on('cursor:move', onMove); socket.on('cursor:hide', drop); socket.on('presence:leave', drop); socket.on('disconnect', clear)
    return () => { clearInterval(sweep); socket.off('cursor:move', onMove); socket.off('cursor:hide', drop); socket.off('presence:leave', drop); socket.off('disconnect', clear) }
  }, [socket])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute top-0 left-0 z-30">
      {[...cursors.values()].map((c) => <CursorTag key={c.id} name={c.name} x={c.x * width} y={c.y} />)}
    </div>
  )
}
