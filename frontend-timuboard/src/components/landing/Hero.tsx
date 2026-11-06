import { Link } from '@/lib/router'
import { useI18n } from '@/hooks/useI18n'
import { Button } from '@/components/ui/button'
import { GradientBackground } from '@/components/ui/oceanic-shimmer'
import Navbar from './Navbar'
import BoardPreview from './BoardPreview'

export default function Hero() {
  const { t } = useI18n()
  return (
    <header className="relative isolate mt-4 overflow-hidden rounded-nav px-4 pt-4">
      {/* Dibungkus div absolut: komponen memakai position:relative inline sehingga class absolute tidak akan menang. */}
      <div className="absolute inset-0 -z-10"><GradientBackground /></div>
      <Navbar />
      <div className="flex flex-col items-center gap-6 pt-24 text-center text-[#222326] max-[760px]:pt-14">
        <h1 data-m="title" className="text-hero">{t('Semua kerja tim,', 'All your team’s work,')}<br />{t('satu papan.', 'one board.')}</h1>
        <p data-m="hero-item" className="text-lead max-w-[30em] text-[#222326]/75!">{t('Atur tugas, pantau progres, dan tahu siapa mengerjakan apa tanpa perlu bertanya di grup chat.', 'Organize tasks, track progress, and know who’s doing what without asking in the group chat.')}</p>
        <div data-m="hero-item" className="flex flex-wrap justify-center gap-4">
          <Button asChild><Link to="/daftar">{t('Buat papan pertama', 'Create your first board')}</Link></Button>
          <Button asChild variant="secondary"><Link to="/playground">{t('Coba di Playground', 'Try the Playground')}</Link></Button>
        </div>
        <BoardPreview />
      </div>
    </header>
  )
}
