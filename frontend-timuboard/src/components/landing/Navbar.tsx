import { Link } from '@/lib/router'
import { useI18n } from '@/hooks/useI18n'
import { Button } from '@/components/ui/button'
import Logo from '@/components/common/Logo'
import ThemeToggle from '@/components/common/ThemeToggle'
import LangSwitch from '@/components/common/LangSwitch'

const links = [['Fitur', 'Features', '#fitur'], ['Cerita tim', 'Stories', '#cerita'], ['Harga', 'Pricing', '#mulai']]


export default function Navbar() {
  const { t } = useI18n()
  return (
    <nav data-m="nav" aria-label={t('Utama', 'Main')} className="mx-auto flex max-w-[1100px] items-center gap-6 rounded-nav bg-background py-3 pr-4 pl-6 backdrop-blur-lg max-[760px]:gap-2 max-[760px]:pl-4">
      <Logo compact className="mr-auto" />
      {links.map(([id, en, href]) => (
        <a key={href} href={href} className="text-base font-medium text-muted-foreground hover:text-foreground max-[760px]:hidden">{t(id, en)}</a>
      ))}
      <Link to="/playground" className="text-base font-medium text-muted-foreground hover:text-foreground max-[760px]:hidden">Playground</Link>
      <Link to="/masuk" className="text-base font-medium text-muted-foreground hover:text-foreground max-[520px]:hidden">{t('Masuk', 'Sign in')}</Link>
      <LangSwitch />
      <ThemeToggle />
      <Button asChild><Link to="/daftar">{t('Coba gratis', 'Try free')}</Link></Button>
    </nav>
  )
}
