import { useDraggable } from '@dnd-kit/react'
import { ArrowRight, GripVertical, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { demoColumns, type DemoStatus } from '@/data/playground'
import { useI18n } from '@/hooks/useI18n'

type Props = { id: string; title: string; tag: string; status: DemoStatus; onMove: (to: DemoStatus) => void }

/** Kartu demo: seret lewat gagang, atau pakai tombol panah (keyboard/layar sentuh). */
export default function DemoCard({ id, title, tag, status, onMove }: Props) {
  const { ref, handleRef, isDragging } = useDraggable({ id, type: 'item' })
  const { t } = useI18n()
  const i = demoColumns.findIndex((c) => c.id === status)
  const next = demoColumns[i + 1]
  const target = next ?? demoColumns[0]
  return (
    <article ref={ref} className={cn('flex flex-col gap-3 rounded-card bg-background p-5 transition-shadow', isDragging && 'shadow-lift ring-2 ring-ring')}>
      <div className="flex items-start justify-between gap-2">
        <Badge size="sm">{tag}</Badge>
        <button ref={handleRef} type="button" aria-label={t(`Seret "${title}"`, `Drag "${title}"`)} className="grid size-7 cursor-grab touch-none place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground active:cursor-grabbing">
          <GripVertical size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      <div className="flex items-end justify-between gap-2">
        <h3 className="text-xl leading-tight font-semibold tracking-[-0.02em]">{title}</h3>
        <Button variant="secondary" size="icon-sm" className="shrink-0" onClick={() => onMove(target.id)} aria-label={t(`Pindahkan "${title}" ke ${target.name}`, `Move "${title}" to ${target.name}`)}>
          {next ? <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" /> : <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />}
        </Button>
      </div>
    </article>
  )
}
