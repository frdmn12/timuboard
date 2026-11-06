import { useWorkspace } from '@/hooks/useWorkspace'
import Topbar from '@/components/dashboard/Topbar'
import PinnedList from '@/components/pinned/PinnedList'
import { useI18n } from '@/hooks/useI18n'

export default function Disematkan() {
  const { pinned } = useWorkspace()
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-6">
      <Topbar title={t('Disematkan', 'Pinned')} />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">{pinned.length} {t('tugas', 'tasks')}</p>
        <h1 className="text-[clamp(32px,4.5vw,48px)] leading-none font-semibold tracking-[-0.03em]">{t('Disematkan', 'Pinned')}</h1>
        <p className="text-lg text-muted-foreground">{t('Tugas penting yang Anda tandai, dari semua proyek, dalam satu tempat.', 'Important tasks you’ve starred, from every project, in one place.')}</p>
      </div>
      <PinnedList tasks={pinned} />
    </div>
  )
}
