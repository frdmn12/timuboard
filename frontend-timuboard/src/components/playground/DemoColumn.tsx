import type { ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/react'
import { cn } from '@/lib/utils'
import type { demoColumns } from '@/data/playground'
import { useI18n } from '@/hooks/useI18n'

type Props = { column: (typeof demoColumns)[number]; count: number; children: ReactNode }

export default function DemoColumn({ column: c, count, children }: Props) {
  const { ref, isDropTarget } = useDroppable({ id: c.id, accept: 'item' })
  const { t } = useI18n()
  return (
    <section ref={ref} aria-label={c.name} className={cn('flex w-[280px] shrink-0 flex-col gap-3 rounded-card p-4 transition-shadow min-[900px]:w-auto', c.wash, isDropTarget && 'ring-2 ring-ring')}>
      <h2 className="flex items-center gap-2 px-1 text-xl leading-9 font-semibold tracking-[-0.02em]">
        <span className={cn('size-2.5 rounded-full', c.dot)} aria-hidden="true" />{c.name}
        <span className="text-sm font-normal text-muted-foreground">{count}</span>
      </h2>
      {children}
      {!count && <p className="rounded-image px-2 py-10 text-center text-sm text-muted-foreground">{t('Lepas kartu di sini.', 'Drop cards here.')}</p>}
    </section>
  )
}
