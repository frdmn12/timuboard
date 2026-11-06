import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useI18n } from '@/hooks/useI18n'

/** Pesan galat singkat saat sinkronisasi dengan server gagal. */
export default function SyncNotice() {
  const { notice, dismissNotice } = useWorkspace()
  const { t } = useI18n()
  if (!notice) return null
  return (
    <div role="alert" className="fixed top-4 left-1/2 z-50 flex max-w-[min(480px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-full bg-primary py-2 pr-2 pl-5 text-sm text-primary-foreground shadow-float">
      <span>{notice}</span>
      <Button variant="ghost" size="icon-sm" onClick={dismissNotice} aria-label={t('Tutup pesan', 'Dismiss message')} className="text-primary-foreground hover:text-primary-foreground"><X size={16} strokeWidth={1.75} aria-hidden="true" /></Button>
    </div>
  )
}
