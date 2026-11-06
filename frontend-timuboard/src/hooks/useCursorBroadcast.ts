import { useEffect, type RefObject } from 'react'
import type { Socket } from 'socket.io-client'
import { socket as boardSocket } from '@/lib/socket'

const MIN_INTERVAL_MS = 40 // maksimal 25 pesan per detik (server membatasi 30/detik)

/**
 * Kirim posisi kursor ke anggota lain yang membuka papan yang sama.
 * x = pecahan lebar area (termasuk bagian yang tergulir), y = piksel dari tepi atas area; jadi tetap tepat di layar berbeda.
 * Tidak berlaku untuk layar sentuh; berhenti saat kursor keluar area atau tab disembunyikan.
 * `socket` bisa diganti (mis. koneksi Playground); server Playground mengabaikan `boardId`.
 */
export function useCursorBroadcast(ref: RefObject<HTMLElement | null>, boardId: string | null, socket: Socket = boardSocket) {
  useEffect(() => {
    const el = ref.current
    if (!el || !boardId) return
    let last = 0
    let shown = false

    const hide = () => {
      if (shown && socket.connected) socket.emit('cursor:hide', { boardId })
      shown = false
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !socket.connected) return
      const now = performance.now()
      if (now - last < MIN_INTERVAL_MS) return
      last = now
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left + el.scrollLeft) / el.scrollWidth
      socket.volatile.emit('cursor:move', { boardId, x, y: e.clientY - rect.top })
      shown = true
    }
    const onVisibility = () => { if (document.hidden) hide() }

    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', hide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', hide)
      document.removeEventListener('visibilitychange', onVisibility)
      hide()
    }
  }, [ref, boardId, socket])
}
