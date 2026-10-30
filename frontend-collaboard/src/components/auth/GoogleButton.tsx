import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/useI18n'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SRC = 'https://accounts.google.com/gsi/client'
const GIS_MAX_W = 400 // lebar maksimum yang diterima renderButton
const GIS_H = 40 // tinggi tombol "large" GIS

type Gsi = {
  accounts: { id: {
    initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void
    renderButton: (el: HTMLElement, o: Record<string, unknown>) => void
  } }
}
declare global { interface Window { google?: Gsi } }

let initialized = false
let handler: ((credential: string) => void) | null = null // milik instance yang sedang terpasang
let loading: Promise<void> | null = null
const loadGsi = () => (loading ??= new Promise<void>((resolve, reject) => {
  if (window.google) return resolve()
  const s = document.createElement('script')
  s.src = SRC; s.async = true
  s.onload = () => resolve()
  s.onerror = () => { loading = null; reject(new Error('GSI')) }
  document.head.appendChild(s)
}))

/** Logo "G" resmi Google (warna merek wajib dipertahankan). */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-5">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/**
 * Tombol Google bergaya Collaboard. Tampilan = Button secondary kita; yang menerima klik adalah
 * tombol resmi GIS (iframe, tak bisa di-style) yang dipasang transparan di atasnya, diskalakan
 * mengikuti ukuran tombol. Tidak tampil bila VITE_GOOGLE_CLIENT_ID kosong.
 */
type Props = { onCredential: (credential: string) => void }

export default function GoogleButton({ onCredential }: Props) {
  const { t } = useI18n()
  const wrap = useRef<HTMLDivElement>(null)
  const gis = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<[number, number]>([1, 1])
  useEffect(() => { handler = onCredential; return () => { if (handler === onCredential) handler = null } }, [onCredential])

  useEffect(() => {
    if (!CLIENT_ID) return
    let active = true
    let ro: ResizeObserver | undefined
    loadGsi().then(() => {
      const w = wrap.current, g = gis.current
      if (!active || !w || !g || !window.google) return
      const gisW = Math.min(GIS_MAX_W, Math.max(200, Math.round(w.offsetWidth)))
      g.style.width = `${gisW}px`
      // Google memperingatkan bila initialize dipanggil berulang: cukup sekali; callback memakai `handler` terbaru.
      if (!initialized) {
        window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: (r) => handler?.(r.credential) })
        initialized = true
      }
      window.google.accounts.id.renderButton(g, { type: 'standard', size: 'large', width: gisW })
      const fit = () => setScale([w.offsetWidth / gisW, w.offsetHeight / GIS_H])
      fit()
      ro = new ResizeObserver(fit)
      ro.observe(w)
    }).catch(() => { /* skrip diblokir: form email tetap bisa dipakai */ })
    return () => { active = false; ro?.disconnect() }
  }, [])

  if (!CLIENT_ID) return null
  return (
    <div
      ref={wrap}
      className="group relative rounded-full focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
    >
      <Button type="button" variant="secondary" size="lg" tabIndex={-1} aria-hidden="true" className="pointer-events-none w-full group-hover:bg-secondary/80">
        <GoogleG />
        {t('Lanjutkan dengan Google', 'Continue with Google')}
      </Button>
      <div className="absolute inset-0 overflow-hidden rounded-full opacity-[0.01]">
        <div ref={gis} style={{ height: GIS_H, transformOrigin: '0 0', transform: `scale(${scale[0]}, ${scale[1]})` }} />
      </div>
    </div>
  )
}
