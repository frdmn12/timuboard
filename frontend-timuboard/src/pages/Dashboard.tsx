import { useRef, useState } from 'react'
import { useDashboardMotion } from '@/hooks/useDashboardMotion'
import { useTasks } from '@/hooks/useTasks'
import type { Status } from '@/data/dashboard'
import Topbar from '@/components/dashboard/Topbar'
import Greeting from '@/components/dashboard/Greeting'
import StatCards from '@/components/dashboard/StatCards'
import BoardToolbar from '@/components/dashboard/BoardToolbar'
import Board from '@/components/dashboard/Board'
import TeamLoad from '@/components/dashboard/TeamLoad'
import RequireBoard from '@/components/layout/RequireBoard'
import type { View } from '@/components/dashboard/ViewToggle'
import { useI18n } from '@/hooks/useI18n'

export default function Dashboard() {
  const root = useRef<HTMLDivElement>(null)
  const [adding, setAdding] = useState<Status | null>(null)
  const [view, setView] = useState<View>('grid')
  const { tasks, visible, count, percent, load, advance, addTask, query, setQuery, who, setWho } = useTasks()
  useDashboardMotion(root)
  const { t } = useI18n()

  const stats = [
    { label: t('Progres', 'Progress'), value: percent('done'), color: 'var(--recovery-green)', note: t(`${count('done')} dari ${tasks.length} tugas selesai`, `${count('done')} of ${tasks.length} tasks done`) },
    { label: t('Sedang dikerjakan', 'In progress'), value: percent('doing'), color: 'var(--metric-blue)', note: t(`${count('doing')} tugas aktif`, `${count('doing')} active tasks`) },
    { label: t('Menunggu review', 'Awaiting review'), value: percent('review'), color: 'var(--sleep-lilac)', note: t(`${count('review')} perlu ditinjau`, `${count('review')} to review`) },
  ]

  return (
    <div ref={root} className="flex flex-col gap-8">
      <Topbar title={t('Dasbor', 'Dashboard')} onNew={() => setAdding('todo')} />
      <RequireBoard>
        <Greeting active={count('doing') + count('review')} />
        <StatCards stats={stats} />
        <section aria-label={t('Papan tugas', 'Task board')} className="flex flex-col gap-4">
          <BoardToolbar query={query} onQuery={setQuery} who={who} onWho={setWho} view={view} onView={setView} />
          <Board tasks={visible} view={view} adding={adding} onAdding={setAdding} onAdd={(t, s) => addTask(t, s)} onAdvance={advance} />
        </section>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4"><TeamLoad load={load} /></div>
      </RequireBoard>
    </div>
  )
}
