import { ChevronLeft, Plus } from 'lucide-react'
import { Link } from '@/lib/router'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/notifications/NotificationBell'
import ThemeToggle from '@/components/common/ThemeToggle'
import { useI18n } from '@/hooks/useI18n'

export default function Topbar({ title, onNew, newLabel }: { title: string; onNew?: () => void; newLabel?: string }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-2">
      <nav aria-label={t('Jejak', 'Breadcrumb')} className="mr-auto flex items-center gap-2 text-lg">
        <Button asChild variant="ghost" size="icon-sm" aria-label={t('Kembali', 'Back')}><Link to="/"><ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" /></Link></Button>
        <span className="text-muted-foreground">{t('Beranda', 'Home')}</span><span className="text-muted-foreground">/</span><b className="font-medium">{title}</b>
      </nav>
      <NotificationBell />
      <ThemeToggle />
      {onNew && <Button onClick={onNew} className="ml-2"><Plus strokeWidth={1.75} aria-hidden="true" />{newLabel ?? t('Tugas baru', 'New task')}</Button>}
    </div>
  )
}
