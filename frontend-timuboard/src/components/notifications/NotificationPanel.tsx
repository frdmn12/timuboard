import { BellOff } from 'lucide-react'
import { useNavigate } from '@/lib/router'
import { Button } from '@/components/ui/button'
import SegmentedFilter from '@/components/common/SegmentedFilter'
import NotificationItem from './NotificationItem'
import { useNotifications } from '@/hooks/useNotifications'
import { useWorkspace } from '@/hooks/useWorkspace'
import type { AppNotification } from '@/data/notifications'
import { useI18n } from '@/hooks/useI18n'

/** Isi popover: header, filter, daftar, status memuat/kosong/galat, dan paginasi. */
export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const n = useNotifications()
  const { selectBoard, refreshBoards } = useWorkspace()
  const navigate = useNavigate()
  const { t } = useI18n()

  const open = async (item: AppNotification) => {
    void n.markRead(item.id)
    if (item.boardId) {
      if (item.type === 'board_added') await refreshBoards().catch(() => undefined)
      selectBoard(item.boardId)
      navigate('/papan')
    }
    onClose()
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">{t('Notifikasi', 'Notifications')}</h2>
        <Button variant="secondary" disabled={n.unreadCount === 0} onClick={() => void n.markAllRead()}>{t('Tandai semua dibaca', 'Mark all as read')}</Button>
      </div>
      <SegmentedFilter label={t('Filter notifikasi', 'Filter notifications')} value={n.filter} options={[['all', t('Semua', 'All')], ['unread', t('Belum dibaca', 'Unread')]]} onChange={n.setFilter} />
      {n.actionError && <p role="alert" className="rounded-image bg-secondary px-3 py-2 text-sm">{n.actionError}</p>}
      <div className="max-h-[min(60dvh,440px)] overflow-y-auto" aria-busy={n.load === 'loading'}>
        {n.load === 'loading' && <p role="status" className="p-6 text-center text-sm">{t('Memuat notifikasi…', 'Loading notifications…')}</p>}
        {n.load === 'error' && (
          <div role="alert" className="flex flex-col items-center gap-3 p-6 text-center text-sm">
            <p>{t('Notifikasi gagal dimuat.', 'Couldn’t load notifications.')}</p>
            <Button variant="secondary" onClick={() => void n.refresh()}>{t('Coba lagi', 'Try again')}</Button>
          </div>
        )}
        {n.load === 'ready' && n.items.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-sm">
            <BellOff size={24} strokeWidth={1.75} aria-hidden="true" />
            <p className="font-medium">{n.filter === 'unread' ? t('Semua sudah dibaca', 'You’re all caught up') : t('Belum ada notifikasi', 'No notifications yet')}</p>
          </div>
        )}
        {n.load === 'ready' && n.items.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {n.items.map((item) => <NotificationItem key={item.id} notification={item} onOpen={(x) => void open(x)} />)}
          </ul>
        )}
        {n.load === 'ready' && n.nextBefore && (
          <div className="flex justify-center pt-2">
            <Button variant="secondary" disabled={n.loadingMore} onClick={() => void n.loadOlder()}>{n.loadingMore ? t('Memuat…', 'Loading…') : t('Muat notifikasi lebih lama', 'Load older notifications')}</Button>
          </div>
        )}
      </div>
    </div>
  )
}
