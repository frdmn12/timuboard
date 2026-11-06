import { useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/useI18n'
import { localizePath, savePref, stripLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Tombol ganti bahasa: pindah ke URL bahasa lain di laman yang sama dan ingat pilihannya. */
export default function LangSwitch({ className }: { className?: string }) {
  const { lang } = useI18n()
  const { pathname, search, hash, state } = useLocation()
  const navigate = useNavigate()
  const next = lang === 'en' ? 'id' : 'en'
  const go = () => { savePref(next); navigate(localizePath(stripLang(pathname), next) + search + hash, { state }) }
  return (
    <Button variant="secondary" size="icon" className={cn('text-sm font-medium', className)} onClick={go} lang={next}
      aria-label={next === 'en' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}>
      {next.toUpperCase()}
    </Button>
  )
}
