import { UserPlus } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import UserAvatar from '@/components/common/UserAvatar'
import { tintOf, type Task } from '@/data/dashboard'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useI18n } from '@/hooks/useI18n'

/** Penanggung jawab tugas: klik untuk memilih anggota papan. */
export default function AssigneeMenu({ task }: { task: Task }) {
  const { members, assign } = useWorkspace()
  const { t } = useI18n()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex cursor-pointer items-center gap-2 rounded-full pr-2 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-label={t(`Penanggung jawab: ${task.who || 'belum ada'}. Ubah`, `Assignee: ${task.who || 'none'}. Change`)}>
        {task.who ? <><UserAvatar name={task.who} tint={tintOf(task.who)} />{task.who}</> : <><span className="grid size-7 place-items-center rounded-full bg-secondary"><UserPlus size={14} strokeWidth={1.75} aria-hidden="true" /></span>{t('Tugaskan', 'Assign')}</>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="rounded-image border-0 bg-popover p-2 shadow-lift">
        <DropdownMenuRadioGroup value={task.assigneeId ?? 'none'} onValueChange={(v) => assign(task, v === 'none' ? null : v)}>
          <DropdownMenuRadioItem value="none">{t('Belum ditugaskan', 'Unassigned')}</DropdownMenuRadioItem>
          {members.map((m) => <DropdownMenuRadioItem key={m.userId} value={m.userId}>{m.name}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
