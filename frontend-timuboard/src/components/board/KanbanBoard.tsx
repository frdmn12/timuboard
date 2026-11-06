import { useRef } from 'react'
import { useCursorBroadcast } from '@/hooks/useCursorBroadcast'
import { useWorkspace } from '@/hooks/useWorkspace'
import CursorLayer from './CursorLayer'
import { DragDropProvider } from '@dnd-kit/react'
import { move } from '@dnd-kit/helpers'
import { statuses, type Status, type Task } from '@/data/dashboard'
import KanbanColumn from './KanbanColumn'

type Groups = Record<string, string[]>
type Props = {
  tasks: Task[]; allTasks: Task[]; adding: Status | null; onAdding: (s: Status | null) => void
  onReorder: (groups: Groups) => void; onRestore: (tasks: Task[]) => void
  onCommit: (id: string) => void
  /** Beri tahu saat seretan dimulai/selesai agar siaran dari orang lain tidak membuat kartu melompat. */
  onDragging: (on: boolean) => void
  onAdd: (title: string, s: Status) => void; onAdvance: (id: string) => void
}

export default function KanbanBoard({ tasks, allTasks, adding, onAdding, onReorder, onRestore, onCommit, onDragging, onAdd, onAdvance }: Props) {
  const area = useRef<HTMLDivElement>(null)
  const { boardId } = useWorkspace()
  useCursorBroadcast(area, boardId)
  const snapshot = useRef<Task[]>(allTasks)
  const groups: Groups = Object.fromEntries(statuses.map((s) => [s.id, tasks.filter((t) => t.status === s.id).map((t) => t.id)]))

  return (
    <DragDropProvider
      onDragStart={() => { snapshot.current = allTasks; onDragging(true) }}
      onDragOver={(event) => queueMicrotask(() => onReorder(move(groups, event)))}
      onDragEnd={(event) => {
        if (event.canceled) onRestore(snapshot.current)
        else if (event.operation.source) onCommit(String(event.operation.source.id))
        onDragging(false)
      }}
    >
      <div ref={area} className="relative -mx-1 flex gap-4 overflow-x-auto px-1 pb-2 min-[1200px]:grid min-[1200px]:grid-cols-4 min-[1200px]:items-start min-[1200px]:overflow-visible">
        <CursorLayer containerRef={area} />
        {statuses.map((s) => (
          <KanbanColumn key={s.id} status={s} tasks={tasks.filter((t) => t.status === s.id)} adding={adding === s.id} onAdvance={onAdvance}
            onOpenAdd={() => onAdding(s.id)} onCloseAdd={() => onAdding(null)} onAdd={(title) => onAdd(title, s.id)} />
        ))}
      </div>
    </DragDropProvider>
  )
}
