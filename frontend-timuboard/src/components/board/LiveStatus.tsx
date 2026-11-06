import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/useRealtime'
import { useI18n } from '@/hooks/useI18n'

/** Status koneksi realtime; teks selalu tertulis (warna hanya pendukung). */
export default function LiveStatus() {
  const { connected, presence } = useRealtime()
  const { t } = useI18n()
  return (
    <span role="status" className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
      <span className={cn('size-2 rounded-full', connected ? 'bg-status-done' : 'bg-status-blocked')} aria-hidden="true" />
      {connected ? t(`Langsung · ${presence.length} online`, `Live · ${presence.length} online`) : t('Menyambung ulang…', 'Reconnecting…')}
    </span>
  )
}
