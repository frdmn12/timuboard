import type { CSSProperties } from 'react'
import { useI18n } from '@/hooks/useI18n'
import type { Story } from '@/data/landing'

export default function StoryTile({ story: s }: { story: Story }) {
  const { tx } = useI18n()
  return (
    <figure data-m="tile" style={{ '--tint': s.tint } as CSSProperties} className="relative m-0 aspect-[3/4] flex-none basis-[220px] overflow-hidden rounded-image bg-[var(--tint)] shadow-lift">
      {s.photo && <img src={s.photo} alt={s.alt ? tx(s.alt) : s.name} loading="lazy" className="absolute top-[-12%] left-0 h-[124%] w-full object-cover will-change-transform" />}
      <figcaption className={`absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 ${s.photo ? 'bg-gradient-to-t from-black/60 to-transparent pt-12 text-white' : 'text-[#222326]'}`}>
        <b className="text-xl leading-[1.1] font-semibold tracking-[-0.02em]">{s.name}</b>
        <span className="text-xs opacity-80">{tx(s.note)}</span>
      </figcaption>
    </figure>
  )
}
