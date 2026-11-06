import { Link } from '@/lib/router'
import { ChevronDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useI18n } from '@/hooks/useI18n'

/** Pilih proyek aktif; semua halaman (Dasbor, Papan, Kalender, Tim) mengikuti pilihan ini. */
export default function BoardSwitcher() {
  const { boards, board, selectBoard } = useWorkspace()
  const { t } = useI18n()
  if (!board) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex w-fit max-w-full cursor-pointer items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={t(`Proyek aktif: ${board.name}. Ganti proyek`, `Active project: ${board.name}. Switch project`)}>
        <span className="truncate">{board.name}</span><ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="rounded-image border-0 bg-popover p-2 shadow-lift">
        <DropdownMenuRadioGroup value={board.id} onValueChange={selectBoard}>
          {boards.map((b) => <DropdownMenuRadioItem key={b.id} value={b.id}>{b.name}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/proyek">{t('Kelola proyek', 'Manage projects')}</Link></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
