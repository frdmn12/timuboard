import { Progress } from '@/components/ui/progress'

const tones = { doing: 'bg-status-doing', review: 'bg-status-review', done: 'bg-status-done' }
type Props = { title: string; meta: string; pct: number; tone: keyof typeof tones; className?: string }

/** Kartu tugas ringkas untuk pratinjau (landing dan panel auth). */
export default function MiniTask({ title, meta, pct, tone, className }: Props) {
  return (
    <div data-m="task" className={`flex flex-col gap-2 rounded-image bg-background p-4 ${className ?? ''}`}>
      <b className="text-base leading-snug font-medium">{title}</b>
      <Progress value={pct} indicatorClassName={tones[tone]} />
      <span className="text-xs text-muted-foreground">{meta}</span>
    </div>
  )
}
