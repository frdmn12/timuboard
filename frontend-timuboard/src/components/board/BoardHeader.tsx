import UserAvatar from '@/components/common/UserAvatar'
import { useRealtime } from '@/hooks/useRealtime'
import LiveStatus from './LiveStatus'
import BoardSwitcher from '@/components/layout/BoardSwitcher'
import { tintOf } from '@/data/dashboard'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useI18n } from '@/hooks/useI18n'

export default function BoardHeader() {
  const { board, members, tasks } = useWorkspace()
  const { isOnline } = useRealtime()
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted-foreground">{t(`Proyek · ${tasks.length} tugas`, `Project · ${tasks.length} tasks`)}</p>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-[clamp(32px,4.5vw,48px)] leading-none font-semibold tracking-[-0.03em]">{board?.name}</h1>
        <div className="flex -space-x-2">{members.map((m) => (
          <span key={m.userId} className="relative" title={`${m.name}${isOnline(m.userId) ? ' (online)' : ''}`}>
            <UserAvatar name={m.name} tint={tintOf(m.name)} className="ring-2 ring-background" />
            {isOnline(m.userId) && <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-status-done ring-2 ring-background" aria-label={`${m.name} online`} />}
          </span>
        ))}</div>
        <LiveStatus />
        <BoardSwitcher />
      </div>
      {board?.description && <p className="text-lg text-muted-foreground">{board.description}</p>}
      <p className="text-sm text-muted-foreground">{t('Seret kartu antar kolom untuk mengubah status, atau ke atas dan bawah untuk mengatur urutan.', 'Drag cards between columns to change status, or up and down to reorder.')}</p>
    </div>
  )
}
