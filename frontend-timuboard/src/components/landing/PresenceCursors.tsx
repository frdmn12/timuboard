import type { CSSProperties } from 'react'
import { cursors } from '@/data/landing'

/** Kursor kolaborator yang bergerak di atas papan (disembunyikan di layar sempit). */
export default function PresenceCursors() {
  return (
    <>
      {cursors.map(({ name, bg, fill }) => (
        <div key={name} data-m="cursor" aria-hidden="true" style={{ '--c': fill } as CSSProperties} className="pointer-events-none absolute top-0 left-0 z-10 flex items-start gap-0.5 will-change-transform max-[760px]:hidden">
          <svg viewBox="0 0 16 16" className="size-4 stroke-background stroke-[1.5]" style={{ fill: 'var(--c)' }}><path d="M1 1l5 14 2.2-5.8L14 7z" /></svg>
          <span className={`mt-3 rounded-full px-2 py-1 text-xs leading-none font-medium whitespace-nowrap text-[#222326] ${bg}`}>{name}</span>
        </div>
      ))}
    </>
  )
}
