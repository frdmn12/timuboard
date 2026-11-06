import { Card } from '@/components/ui/card'
import UserAvatar from '@/components/common/UserAvatar'
import { tintOf } from '@/data/dashboard'
import type { Guest } from '@/hooks/usePlayground'
import { roomName, tzLabel } from '@/data/playground'
import { useI18n } from '@/hooks/useI18n'

type Props = { members: Guest[]; selfId?: string; total: number; room: number }

/** Isi ruang (maksimal 50 orang, jadi daftar selalu pendek) + jumlah online di semua ruang. */
export default function PresencePanel({ members, selfId, total, room }: Props) {
  const others = total - members.length
  const { t, locale } = useI18n()
  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl leading-tight font-semibold tracking-[-0.02em]">{t('Ruang', 'Room')} {roomName(room)}</h2>
        <span className="text-sm font-medium">{members.length} {t('orang', members.length === 1 ? 'person' : 'people')}</span>
      </div>
      <ul className="flex max-h-[320px] flex-col gap-2 overflow-y-auto" aria-label={t('Pengunjung di ruang ini', 'Visitors in this room')}>
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <span className="relative">
              <UserAvatar name={m.name} tint={tintOf(m.name)} className="size-8" />
              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-status-done ring-2 ring-card" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{m.name}</span>
              {m.tz && <span className="truncate text-xs">{tzLabel(m.tz)}</span>}
            </span>
            {m.id === selfId && <span className="ml-auto text-xs font-medium">{t('kamu', 'you')}</span>}
          </li>
        ))}
      </ul>
      {others > 0 && <p className="text-sm">+{others.toLocaleString(locale)} {t('orang lain di ruang lain', 'more in other rooms')}</p>}
    </Card>
  )
}
