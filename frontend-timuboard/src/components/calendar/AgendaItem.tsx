import StatusChip from '@/components/common/StatusChip'
import UserAvatar from '@/components/common/UserAvatar'
import { statuses, tintOf, type Task } from '@/data/dashboard'
import { useI18n } from '@/hooks/useI18n'

export default function AgendaItem({ task: t }: { task: Task }) {
  const s = statuses.find((x) => x.id === t.status)!
  const { t: tr } = useI18n()
  return (
    <li className="flex flex-col gap-2 rounded-image bg-background p-4">
      <div className="flex items-center justify-between gap-2"><StatusChip label={s.name} dot={s.dot} /></div>
      <b className="text-base leading-snug font-semibold">{t.title}</b>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{t.who ? <><UserAvatar name={t.who} tint={tintOf(t.who)} />{t.who}</> : tr('Belum ditugaskan', 'Unassigned')}</div>
    </li>
  )
}
