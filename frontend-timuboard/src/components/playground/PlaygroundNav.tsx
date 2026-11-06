import { Link } from '@/lib/router'
import { Button } from '@/components/ui/button'
import Logo from '@/components/common/Logo'
import ThemeToggle from '@/components/common/ThemeToggle'
import LangSwitch from '@/components/common/LangSwitch'
import { useI18n } from '@/hooks/useI18n'

export default function PlaygroundNav() {
  const { t } = useI18n()
  return (
    <nav aria-label={t('Utama', 'Main')} className="mx-auto flex max-w-[1100px] items-center gap-4 rounded-nav bg-card py-3 pr-4 pl-6 max-[760px]:gap-2 max-[760px]:pl-4">
      <Logo compact className="mr-auto" />
      <LangSwitch />
      <ThemeToggle />
      <Button asChild><Link to="/daftar">{t('Coba gratis', 'Try free')}</Link></Button>
    </nav>
  )
}
