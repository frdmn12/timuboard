import { useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import type { Status } from '@/data/dashboard'
import Topbar from '@/components/dashboard/Topbar'
import BoardToolbar from '@/components/dashboard/BoardToolbar'
import BoardHeader from '@/components/board/BoardHeader'
import KanbanBoard from '@/components/board/KanbanBoard'
import RequireBoard from '@/components/layout/RequireBoard'
import { useI18n } from '@/hooks/useI18n'

export default function Papan() {
  const [adding, setAdding] = useState<Status | null>(null)
  const { t } = useI18n()
  const { tasks, visible, addTask, advance, reorder, commitMove, restore, setDragging, query, setQuery, who, setWho } = useTasks()
  return (
    <div className="flex flex-col gap-6">
      <Topbar title={t('Papan', 'Board')} onNew={() => setAdding('todo')} />
      <RequireBoard>
        <BoardHeader />
        <BoardToolbar query={query} onQuery={setQuery} who={who} onWho={setWho} />
        <KanbanBoard tasks={visible} allTasks={tasks} adding={adding} onAdding={setAdding} onReorder={reorder} onRestore={restore} onCommit={commitMove} onDragging={setDragging} onAdd={(t, s) => addTask(t, s)} onAdvance={advance} />
      </RequireBoard>
    </div>
  )
}
