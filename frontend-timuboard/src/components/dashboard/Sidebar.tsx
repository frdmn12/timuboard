import { NavLink } from '@/lib/router'
import { CalendarDays, FolderKanban, LayoutDashboard, Settings, SquareKanban, Star, Users, type LucideIcon } from 'lucide-react'
import LogoutButton from '@/components/common/LogoutButton'
import Logo from '@/components/common/Logo'
import { useProfile } from '@/hooks/useProfile'
import UserAvatar from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'
import type { Txt } from '@/lib/i18n'
import { useI18n } from '@/hooks/useI18n'

const sections: { label: Txt; items: [Txt, LucideIcon, string?][] }[] = [
  { label: ['Utama', 'Main'], items: [[['Dasbor', 'Dashboard'], LayoutDashboard, '/dashboard'], [['Papan', 'Board'], SquareKanban, '/papan'], [['Disematkan', 'Pinned'], Star, '/disematkan']] },
  { label: ['Kelola', 'Manage'], items: [[['Proyek', 'Projects'], FolderKanban, '/proyek'], [['Tim', 'Team'], Users, '/tim'], [['Kalender', 'Calendar'], CalendarDays, '/kalender']] },
  { label: ['Pengaturan', 'Settings'], items: [[['Pengaturan', 'Settings'], Settings, '/pengaturan']] },
]

export default function Sidebar() {
  const { profile } = useProfile()
  const { t, tx } = useI18n()
  return (
    <aside className="sticky top-0 flex h-dvh flex-col gap-6 self-start overflow-y-auto bg-card px-4 py-6 max-[900px]:fixed max-[900px]:inset-x-0 max-[900px]:top-auto max-[900px]:bottom-0 max-[900px]:z-10 max-[900px]:h-auto max-[900px]:overflow-visible max-[900px]:p-2 max-[900px]:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-5 max-[900px]:hidden">
        <Logo className="px-2" />
        <div className="flex items-center gap-3 px-2">
          <UserAvatar name={profile.name} tint="var(--sleep-lilac)" size="default" className="size-10" />
          <div className="flex min-w-0 flex-col"><b className="truncate text-base leading-tight font-semibold">{profile.name}</b><span className="truncate text-xs text-muted-foreground">{profile.email}</span></div>
        </div>
      </div>
      <nav aria-label={t('Dasbor', 'Dashboard')} className="flex flex-col gap-5 max-[900px]:w-full max-[900px]:flex-row max-[900px]:justify-around max-[900px]:gap-0">
        {sections.map((sec, si) => (
          <div key={sec.label[0]} className={cn('flex flex-col gap-1 max-[900px]:flex-row', si === 2 && 'mt-auto max-[900px]:mt-0')}>
            <p className="px-3 pb-1 text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase max-[900px]:hidden">{tx(sec.label)}</p>
            {sec.items.map(([label, Icon, to]) => {
              const cls = (active: boolean) => cn('flex items-center gap-3 rounded-full px-3 py-2.5 text-base font-medium text-muted-foreground hover:text-foreground max-[900px]:flex-col max-[900px]:gap-0.5 max-[900px]:rounded-image max-[900px]:px-2.5 max-[900px]:py-2 max-[900px]:text-[11px] max-[900px]:leading-tight', active && 'bg-background text-foreground')
              const inner = <><Icon size={20} strokeWidth={1.75} aria-hidden="true" />{tx(label)}</>
              return to
                ? <NavLink key={label[0]} to={to} className={({ isActive }) => cls(isActive)}>{inner}</NavLink>
                : <a key={label[0]} href="#" onClick={(e) => e.preventDefault()} className={cls(false)}>{inner}</a>
            })}
          </div>
        ))}
      </nav>
      <LogoutButton variant="ghost" className="justify-start px-3 max-[900px]:hidden" />
    </aside>
  )
}
