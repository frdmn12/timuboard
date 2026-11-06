import { Link } from '@/lib/router'
import { useI18n } from '@/hooks/useI18n'
import { Button } from '@/components/ui/button'

export default function FinalCta() {
  const { t } = useI18n()
  return (
    <section id="mulai" className="pt-20">
      <div data-m="final" className="flex flex-col items-center gap-6 rounded-nav bg-sky px-6 py-20 text-center">
        <h2 className="text-display">{t('Mulai dalam semenit.', 'Get started in a minute.')}</h2>
        <p className="text-lead max-w-[36em]">{t('Gratis untuk tim sampai 10 orang. Tanpa kartu kredit.', 'Free for teams of up to 10. No credit card.')}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild><Link to="/daftar">{t('Buat papan pertama', 'Create your first board')}</Link></Button>
          <Button asChild variant="secondary"><Link to="/masuk">{t('Sudah punya akun? Masuk', 'Have an account? Sign in')}</Link></Button>
        </div>
      </div>
    </section>
  )
}
