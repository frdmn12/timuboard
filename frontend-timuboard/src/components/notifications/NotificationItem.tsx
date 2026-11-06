import { Eye, FolderPlus, MessageSquare, UserPlus } from 'lucide-react'
import UserAvatar from '@/components/common/UserAvatar'
import { tintOf } from '@/data/dashboard'
import { notificationText, type AppNotification, type NotificationType } from '@/data/notifications'
import { formatRelative } from '@/lib/date'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'

const icons: Record<NotificationType, typeof Eye> = { task_assigned: UserPlus, comment_added: MessageSquare, review_requested: Eye, board_added: FolderPlus }

type Props = { notification: AppNotification; onOpen: (n: AppNotification) => void }

/** Satu notifikasi. Belum dibaca: titik + teks tebal (bukan hanya warna). */
export default function NotificationItem({ notification: n, onOpen }: Props) {
  const Icon = icons[n.type]
  const { t } = useI18n()
  const who = n.actor?.name ?? t('Seseorang', 'Someone')
  return (
    <li>
      <button type="button" onClick={() => onOpen(n)} className="flex w-full cursor-pointer items-start gap-3 rounded-image p-3 text-left hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <UserAvatar name={who} tint={tintOf(who)} className="mt-0.5 shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn('text-sm', n.read ? 'font-normal' : 'font-semibold')}>
            <span className="font-semibold">{who}</span> {notificationText(n)}
            {n.type !== 'board_added' && n.data.boardName && <span className="font-normal text-muted-foreground"> {t('di', 'in')} {n.data.boardName}</span>}
          </span>
          {n.data.preview && <span className="line-clamp-2 text-sm font-normal text-muted-foreground">{n.data.preview}</span>}
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon size={16} strokeWidth={1.75} aria-hidden="true" />{formatRelative(n.createdAt)}
          </span>
        </span>
        {!n.read && <><span className="mt-2 size-2.5 shrink-0 rounded-full bg-[var(--status-doing)]" aria-hidden="true" /><span className="sr-only">{t('Belum dibaca', 'Unread')}</span></>}
      </button>
    </li>
  )
}
