import { Link } from '@/lib/router'
import { Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import StatusChip from '@/components/common/StatusChip'
import TaskCard from '@/components/dashboard/TaskCard'
import { statuses, type Task } from '@/data/dashboard'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useI18n } from '@/hooks/useI18n'

export default function PinnedList({ tasks }: { tasks: Task[] }) {
  const { boards, selectBoard } = useWorkspace()
  const { t: tr } = useI18n()
  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card bg-card px-6 py-16 text-center">
        <Star size={24} strokeWidth={1.75} aria-hidden="true" className="text-muted-foreground" />
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">{tr('Belum ada tugas yang disematkan', 'No pinned tasks yet')}</h2>
        <p className="max-w-[28em] text-base text-muted-foreground">{tr('Tekan ikon bintang di pojok kartu tugas pada Dasbor atau Papan untuk menyematkannya di sini.', 'Tap the star on a task card in the Dashboard or Board to pin it here.')}</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      {tasks.map((t) => {
        const s = statuses.find((x) => x.id === t.status)!
        const boardName = boards.find((b) => b.id === t.boardId)?.name ?? tr('Proyek', 'Project')
        return (
          <div key={t.id} className="flex flex-col gap-2 rounded-card bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip label={s.name} dot={s.dot} />
              <Link to="/papan" onClick={() => selectBoard(t.boardId)} aria-label={tr(`Buka papan ${boardName}`, `Open board ${boardName}`)}><Badge size="sm" className="bg-background">{boardName}</Badge></Link>
            </div>
            <TaskCard task={t} bar={s.bar} />
          </div>
        )
      })}
    </div>
  )
}
