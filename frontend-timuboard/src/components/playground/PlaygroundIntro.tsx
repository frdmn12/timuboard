import { cn } from '@/lib/utils'
import { roomName } from '@/data/playground'
import { useI18n } from '@/hooks/useI18n'

type Props = { status: 'connecting' | 'online' | 'offline' | 'full'; total: number; room: number }


export default function PlaygroundIntro(props: Props) {
  const { t, locale } = useI18n()
  const label = {
    connecting: t('Menyambung…', 'Connecting…'),
    offline: t('Menyambung ulang…', 'Reconnecting…'),
    full: t('Terlalu banyak tab dari jaringanmu. Tutup salah satu.', 'Too many tabs from your network. Close one.'),
    online: t(`Langsung · ${props.total.toLocaleString(locale)} online · Ruang ${roomName(props.room)}`, `Live · ${props.total.toLocaleString(locale)} online · Room ${roomName(props.room)}`),
  }[props.status]
  return (
    <header className="flex flex-col items-start gap-4">
      <span role="status" className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-foreground">
        <span className={cn('size-2.5 rounded-full', props.status === 'online' ? 'bg-status-done' : 'bg-status-blocked')} aria-hidden="true" />
        {label}
      </span>
      <h1 className="text-display">Playground</h1>
      <p className="text-lead max-w-[34em]">{t('Coba Timuboard bersama pengunjung lain, tanpa akun. Geser kartu, kirim reaksi, dan lihat siapa saja yang sedang di sini.', 'Try Timuboard with other visitors, no account needed. Move cards, send reactions, and see who’s here right now.')}</p>
    </header>
  )
}
