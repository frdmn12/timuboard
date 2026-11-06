import { statuses, type Status, type Task } from '@/data/dashboard'
import { cn } from '@/lib/utils'
import BoardColumn from './BoardColumn'
import type { View } from './ViewToggle'
import { useI18n } from '@/hooks/useI18n'

type Props = {
  tasks: Task[]; view: View; adding: Status | null
  onAdding: (s: Status | null) => void; onAdd: (title: string, s: Status) => void; onAdvance: (id: string) => void
}

export default function Board({ tasks, view, adding, onAdding, onAdd, onAdvance }: Props) {
  const { t } = useI18n()
  return (
    <div aria-label={t('Papan tugas', 'Task board')} className={cn('grid gap-4', view === 'grid' ? 'grid-cols-2 items-stretch max-[900px]:grid-cols-1' : 'grid-cols-[repeat(auto-fit,minmax(230px,1fr))] items-start')}>
      {statuses.map((s) => (
        <BoardColumn key={s.id} status={s} tasks={tasks.filter((t) => t.status === s.id)} adding={adding === s.id} onAdvance={onAdvance}
          onOpenAdd={() => onAdding(s.id)} onCloseAdd={() => onAdding(null)} onAdd={(title) => onAdd(title, s.id)} />
      ))}
    </div>
  )
}
