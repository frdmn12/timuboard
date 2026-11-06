import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import NotificationPanel from './NotificationPanel'
import { useNotifications } from '@/hooks/useNotifications'
import { useI18n } from '@/hooks/useI18n'

/** Lonceng topbar: lencana jumlah belum dibaca + panel notifikasi. */
export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { unreadCount, refresh } = useNotifications()
  const { t } = useI18n()
  const label = unreadCount > 0 ? t(`Notifikasi, ${unreadCount} belum dibaca`, `Notifications, ${unreadCount} unread`) : t('Notifikasi', 'Notifications')
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) void refresh() }}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="icon" aria-label={label} className="relative">
          <Bell strokeWidth={1.75} aria-hidden="true" />
          {unreadCount > 0 && (
            <span aria-hidden="true" className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-2rem))] p-0"><NotificationPanel onClose={() => setOpen(false)} /></PopoverContent>
    </Popover>
  )
}
