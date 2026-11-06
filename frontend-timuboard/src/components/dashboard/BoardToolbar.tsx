import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import FilterMenu from './FilterMenu'
import ViewToggle, { type View } from './ViewToggle'
import { useI18n } from '@/hooks/useI18n'

type Props = { query: string; onQuery: (v: string) => void; who: string; onWho: (v: string) => void; view?: View; onView?: (v: View) => void }

export default function BoardToolbar({ query, onQuery, who, onWho, view, onView }: Props) {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative mr-auto flex min-w-[220px] max-w-[420px] flex-1 items-center">
        <Search size={20} strokeWidth={1.75} aria-hidden="true" className="pointer-events-none absolute left-4 text-muted-foreground" />
        <Input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder={t('Cari tugas', 'Search tasks')} aria-label={t('Cari tugas', 'Search tasks')} className="h-11 pl-11" />
      </label>
      <FilterMenu who={who} onChange={onWho} />
      {view && onView && <ViewToggle view={view} onChange={onView} />}
    </div>
  )
}
