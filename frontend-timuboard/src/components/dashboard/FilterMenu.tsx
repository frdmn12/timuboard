import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useI18n } from '@/hooks/useI18n'

/** Saring tugas per penanggung jawab. `who` = 'semua' atau userId. */
export default function FilterMenu({ who, onChange }: { who: string; onChange: (v: string) => void }) {
  const { members } = useWorkspace()
  const { t } = useI18n()
  const label = who === 'semua' ? 'Filter' : (members.find((m) => m.userId === who)?.name ?? 'Filter')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary"><Filter strokeWidth={1.75} aria-hidden="true" />{label}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-image border-0 bg-popover p-2 shadow-lift">
        <DropdownMenuRadioGroup value={who} onValueChange={onChange}>
          <DropdownMenuRadioItem value="semua">{t('Semua orang', 'Everyone')}</DropdownMenuRadioItem>
          {members.map((m) => <DropdownMenuRadioItem key={m.userId} value={m.userId}>{m.name}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
