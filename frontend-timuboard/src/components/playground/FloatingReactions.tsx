import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { reactions } from '@/data/playground'
import { useI18n } from '@/hooks/useI18n'
import type { Reaction } from '@/hooks/usePlayground'

/** Satu reaksi yang naik lalu memudar. Tanpa animasi (reduced motion) reaksi tetap tampil lalu hilang. */
function Bubble({ r, left }: { r: Reaction; left: number }) {
  const el = useRef<HTMLDivElement>(null)
  const { Icon, label } = reactions.find((x) => x.kind === r.kind)!
  const { t, tx } = useI18n()
  useGSAP(() => {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(el.current, { y: 0, opacity: 0, scale: 0.8 }, { y: -160, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' })
      gsap.to(el.current, { y: -220, opacity: 0, delay: 1.6, duration: 0.6, ease: 'power1.in' })
    })
  }, { scope: el })
  return (
    <div ref={el} className="absolute bottom-4 flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-medium shadow-lift" style={{ left: `${left}%` }}>
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" /><span className="sr-only">{t(`${tx(label)} dari`, `${tx(label)} from`)}</span>{r.name}
    </div>
  )
}

export default function FloatingReactions({ items }: { items: Reaction[] }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {/* Posisi horizontal stabil per reaksi (dari key), tersebar 5-75% */}
      {items.map((r) => <Bubble key={r.key} r={r} left={5 + ((r.key * 37) % 70)} />)}
    </div>
  )
}
