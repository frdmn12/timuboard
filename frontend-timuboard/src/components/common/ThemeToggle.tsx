import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/hooks/useI18n'

export default function ThemeToggle({ className }: { className?: string }) {
  const [dark, toggle] = useTheme()
  const { t } = useI18n()
  return (
    <Button variant="secondary" size="icon" className={className} onClick={toggle} aria-label={t('Ganti tema', 'Toggle theme')}>
      {dark ? <Sun strokeWidth={1.75} aria-hidden="true" /> : <Moon strokeWidth={1.75} aria-hidden="true" />}
    </Button>
  )
}
