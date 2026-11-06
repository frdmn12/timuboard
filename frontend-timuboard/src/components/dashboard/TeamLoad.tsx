import { Progress } from '@/components/ui/progress'
import UserAvatar from '@/components/common/UserAvatar'
import { useI18n } from '@/hooks/useI18n'

type Props = { load: { id: string; name: string; tint: string; n: number }[] }

export default function TeamLoad({ load }: Props) {
  const { t } = useI18n()
  return (
    <section data-m="panel" aria-label={t('Beban kerja tim', 'Team workload')} className="flex min-w-0 flex-col gap-4 rounded-card bg-card p-6">
      <h2 className="text-2xl leading-none font-semibold tracking-[-0.02em]">{t('Beban kerja tim', 'Team workload')}</h2>
      {!load.length && <p className="text-sm text-muted-foreground">{t('Belum ada anggota.', 'No members yet.')}</p>}
      {load.map((m) => (
        <div key={m.id} className="grid grid-cols-[28px_56px_1fr_auto] items-center gap-3 text-sm font-medium">
          <UserAvatar name={m.name} tint={m.tint} /><span>{m.name}</span>
          <Progress value={Math.min(100, m.n * 34)} className="h-2 bg-background" indicatorClassName={m.n > 2 ? 'bg-coral' : 'bg-blue'} />
          <span className="text-xs font-normal text-muted-foreground">{m.n} {t('aktif', 'active')}</span>
        </div>
      ))}
    </section>
  )
}
