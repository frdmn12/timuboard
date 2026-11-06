import { useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { DragDropProvider } from '@dnd-kit/react'
import { useCursorBroadcast } from '@/hooks/useCursorBroadcast'
import { demoColumns, demoTasks, type DemoStatus } from '@/data/playground'
import type { Reaction } from '@/hooks/usePlayground'
import DemoColumn from './DemoColumn'
import DemoCard from './DemoCard'
import PlaygroundCursors from './PlaygroundCursors'
import FloatingReactions from './FloatingReactions'
import { useI18n } from '@/hooks/useI18n'

type Props = { socket: Socket | null; board: Record<string, DemoStatus>; floating: Reaction[]; onMove: (taskId: string, to: DemoStatus) => void }

/** Papan demo bersama satu ruang: seret kartu antar kolom, kursor dan reaksi tamu lain tampil di atasnya. */
export default function DemoBoard({ socket, board, floating, onMove }: Props) {
  const area = useRef<HTMLDivElement>(null)
  const { tx } = useI18n()
  useCursorBroadcast(area, socket ? 'playground' : null, socket ?? undefined)
  const statusOf = (id: string) => board[id] ?? 'doing'
  return (
    <DragDropProvider onDragEnd={(e) => {
      const { source, target } = e.operation
      if (!e.canceled && source && target) onMove(String(source.id), String(target.id) as DemoStatus)
    }}>
      <div ref={area} className="relative -mx-1 flex gap-4 overflow-x-auto px-1 pb-2 min-[900px]:grid min-[900px]:grid-cols-3 min-[900px]:items-start min-[900px]:overflow-visible">
        {socket && <PlaygroundCursors socket={socket} containerRef={area} />}
        <FloatingReactions items={floating} />
        {demoColumns.map((c) => {
          const tasks = demoTasks.filter((t) => statusOf(t.id) === c.id)
          return (
            <DemoColumn key={c.id} column={c} count={tasks.length}>
              {tasks.map((t) => <DemoCard key={t.id} id={t.id} title={tx(t.title)} tag={tx(t.tag)} status={c.id} onMove={(to) => onMove(t.id, to)} />)}
            </DemoColumn>
          )
        })}
      </div>
    </DragDropProvider>
  )
}
