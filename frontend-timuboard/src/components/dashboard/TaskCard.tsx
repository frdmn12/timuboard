import type { ReactNode } from 'react'
import { ArrowRight, CircleCheck, Clock, MessageSquare, Pencil, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { formatDue } from '@/lib/date'
import { useWorkspace } from '@/hooks/useWorkspace'
import { nextStatus, statuses, type Task } from '@/data/dashboard'
import TaskEditDialog from '@/components/tasks/TaskEditDialog'
import AssigneeMenu from './AssigneeMenu'
import { useI18n } from '@/hooks/useI18n'

type Props = { task: Task; bar: string; onAdvance?: (id: string) => void; handle?: ReactNode; className?: string }

export default function TaskCard({ task: t, bar, onAdvance, handle, className }: Props) {
  const { togglePin } = useWorkspace()
  const { t: tr } = useI18n()
  const next = nextStatus(t.status)
  const nextName = statuses.find((s) => s.id === next)?.name
  return (
    <article className={cn('flex flex-col gap-3 rounded-card bg-background p-5', className)}>
      {t.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{t.tags.map((g) => <Badge key={g} size="sm">{g}</Badge>)}</div>}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xl leading-tight font-semibold tracking-[-0.02em]">{t.title}</h4>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => togglePin(t)} aria-pressed={t.pinned} aria-label={t.pinned ? tr(`Lepas sematan "${t.title}"`, `Unpin "${t.title}"`) : tr(`Sematkan "${t.title}"`, `Pin "${t.title}"`)}
            className="grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Star size={16} strokeWidth={1.75} fill={t.pinned ? 'var(--pinned)' : 'none'} color={t.pinned ? 'var(--pinned)' : 'currentColor'} aria-hidden="true" />
          </button>
          <TaskEditDialog task={t}>
            <button type="button" aria-label={tr(`Edit "${t.title}"`, `Edit "${t.title}"`)} className="grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
              <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </TaskEditDialog>
          {handle}
        </div>
      </div>
      {t.desc && <p className="line-clamp-3 text-sm leading-snug text-muted-foreground">{t.desc}</p>}
      <Progress value={t.pct} indicatorClassName={bar} />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <AssigneeMenu task={t} />
        {t.date && <span className="inline-flex items-center gap-1"><Clock size={14} strokeWidth={1.75} aria-hidden="true" />{formatDue(t.date)}</span>}
        <TaskEditDialog task={t} tab="komentar">
          <button type="button" aria-label={tr(`${t.commentCount} komentar pada "${t.title}". Buka komentar`, `${t.commentCount} comments on "${t.title}". Open comments`)} className="inline-flex cursor-pointer items-center gap-1 rounded-full px-1.5 py-0.5 hover:bg-secondary hover:text-foreground">
            <MessageSquare size={14} strokeWidth={1.75} aria-hidden="true" />{t.commentCount}
          </button>
        </TaskEditDialog>
        {next && onAdvance ? (
          <Button variant="secondary" size="icon-sm" className="ml-auto" onClick={() => onAdvance(t.id)} aria-label={tr(`Pindahkan "${t.title}" ke ${nextName}`, `Move "${t.title}" to ${nextName}`)}>
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        ) : t.status === 'done' ? <CircleCheck size={16} strokeWidth={1.75} color="var(--recovery-green)" className="ml-auto" aria-label={tr('Selesai', 'Done')} /> : null}
      </div>
    </article>
  )
}
