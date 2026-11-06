import { useI18n } from '@/hooks/useI18n'
import { stories } from '@/data/landing'
import StoryTile from './StoryTile'

export default function StoriesStrip() {
  const { t } = useI18n()
  return (
    <section id="cerita" className="py-10">
      <div className="flex flex-col items-center gap-6 text-center">
        <h2 data-m="reveal" className="text-display">{t('Tim kecil, kerja besar.', 'Small teams, big work.')}</h2>
        <p data-m="reveal" className="text-lead max-w-[36em]">{t('Studio, kedai, dan lab yang berpindah dari spreadsheet ke satu papan bersama.', 'Studios, cafés, and labs that moved from spreadsheets to one shared board.')}</p>
      </div>
      <div data-m="strip" tabIndex={0} aria-label={t('Cerita tim', 'Team stories')} className="-mx-4 flex gap-4 overflow-x-auto px-4 py-10 [scrollbar-width:none] [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        {stories.map((s) => <StoryTile key={s.name} story={s} />)}
      </div>
    </section>
  )
}
