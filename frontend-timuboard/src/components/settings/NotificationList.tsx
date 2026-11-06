import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { notificationItems, useNotificationPrefs } from '@/hooks/useNotificationPrefs'
import { useI18n } from '@/hooks/useI18n'

export default function NotificationList() {
  const { prefs, error, failed, retry, set } = useNotificationPrefs()
  const { t, tx } = useI18n()
  if (failed) return (
    <div role="alert" className="flex items-center gap-3 text-sm">
      <span>{t('Pengaturan notifikasi gagal dimuat.', 'Couldn’t load notification settings.')}</span><Button variant="secondary" onClick={retry}>{t('Coba lagi', 'Try again')}</Button>
    </div>
  )
  if (!prefs) return <p role="status" className="text-sm">{t('Memuat pengaturan…', 'Loading settings…')}</p>
  return (
    <div className="flex flex-col gap-2">
      {error && <p role="alert" className="text-sm">{error}</p>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {notificationItems.map((n) => (
          <li key={n.id} className="flex items-center justify-between gap-4 rounded-image bg-background p-4">
            <label htmlFor={`n-${n.id}`} className="flex min-w-0 cursor-pointer flex-col gap-0.5">
              <span className="text-base font-medium">{tx(n.label)}</span><span className="text-sm text-muted-foreground">{tx(n.hint)}</span>
            </label>
            <Switch id={`n-${n.id}`} checked={prefs[n.id]} onCheckedChange={(on) => void set(n.id, on)} />
          </li>
        ))}
      </ul>
    </div>
  )
}
