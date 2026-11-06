import MiniTask from '@/components/common/MiniTask'
import { useI18n } from '@/hooks/useI18n'

export default function AuthPanel() {
  const { t } = useI18n()
  return (
    <aside data-m="panel" aria-hidden="true" className="flex min-h-[560px] flex-col justify-between gap-12 overflow-hidden rounded-nav bg-sky p-12 max-[900px]:hidden">
      <h2 className="max-w-[10em] text-[clamp(36px,4vw,56px)] leading-none font-semibold tracking-[-0.03em] text-balance">{t('Semua kerja tim, satu papan.', 'All your team’s work, one board.')}</h2>
      <div className="flex w-full max-w-[420px] flex-col gap-2 self-end rounded-card bg-card p-4 shadow-lift">
        <MiniTask title={t('Redesain alur onboarding', 'Redesign the onboarding flow')} meta={t('Dewi · tenggat Jumat', 'Dewi · due Friday')} pct={60} tone="doing" />
        <MiniTask title={t('Salinan halaman harga', 'Pricing page copy')} meta={t('Sari · menunggu 2 orang', 'Sari · waiting on 2 people')} pct={90} tone="review" />
        <MiniTask title={t('Setup notifikasi email', 'Set up email notifications')} meta={t('Bima · selesai kemarin', 'Bima · done yesterday')} pct={100} tone="done" />
      </div>
    </aside>
  )
}
