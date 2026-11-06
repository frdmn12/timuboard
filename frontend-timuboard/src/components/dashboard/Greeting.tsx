import { useProfile } from '@/hooks/useProfile'
import BoardSwitcher from '@/components/layout/BoardSwitcher'
import { useI18n } from '@/hooks/useI18n'

export default function Greeting({ active }: { active: number }) {
  const { t, locale } = useI18n()
  const first = useProfile().profile.name.split(' ')[0] || t('Anda', 'there')
  const hour = new Date().getHours()
  const greeting = hour < 11 ? t('Selamat pagi', 'Good morning') : hour < 15 ? t('Selamat siang', 'Good afternoon') : hour < 18 ? t('Selamat sore', 'Good afternoon') : t('Selamat malam', 'Good evening')
  const today = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  return (
    <div data-m="head" className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted-foreground capitalize">{today}</p>
      <h1 className="text-[clamp(36px,5vw,56px)] leading-none font-semibold tracking-[-0.03em]">{greeting}, {first}.</h1>
      <div className="flex flex-wrap items-center gap-3 text-lg text-muted-foreground"><BoardSwitcher /><span>{t(`${active} tugas sedang berjalan.`, `${active} ${active === 1 ? 'task' : 'tasks'} in progress.`)}</span></div>
    </div>
  )
}
