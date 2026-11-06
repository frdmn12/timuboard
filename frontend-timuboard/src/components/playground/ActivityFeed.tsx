import { Card } from '@/components/ui/card'
import type { Activity } from '@/hooks/usePlayground'
import { useI18n } from '@/hooks/useI18n'

export default function ActivityFeed({ items }: { items: Activity[] }) {
  const { t, tx } = useI18n()
  return (
    <Card className="p-6">
      <h2 className="text-xl leading-tight font-semibold tracking-[-0.02em]">{t('Baru saja', 'Just now')}</h2>
      <ul aria-live="polite" className="flex flex-col gap-2 text-sm">
        {items.map((a) => <li key={a.key}>{tx(a.text)}</li>)}
        {!items.length && <li>{t('Belum ada aktivitas. Coba geser satu kartu.', 'No activity yet. Try moving a card.')}</li>}
      </ul>
    </Card>
  )
}
