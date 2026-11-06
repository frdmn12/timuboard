import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useWorkspace } from '@/hooks/useWorkspace'
import { boardRoleLabel, type Member } from '@/data/team'
import Topbar from '@/components/dashboard/Topbar'
import SegmentedFilter from '@/components/common/SegmentedFilter'
import BoardSwitcher from '@/components/layout/BoardSwitcher'
import RequireBoard from '@/components/layout/RequireBoard'
import MemberCard from '@/components/team/MemberCard'
import InviteForm from '@/components/team/InviteForm'
import { useI18n } from '@/hooks/useI18n'

type Filter = 'semua' | Member['role']

export default function Tim() {
  const [inviting, setInviting] = useState(false)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<Filter>('semua')
  const { board, members, tasks, addMember } = useWorkspace()
  const { t, tx } = useI18n()

  const rows = members.map((m) => ({
    ...m,
    active: tasks.filter((t) => t.assigneeId === m.userId && t.status !== 'done').length,
    done: tasks.filter((t) => t.assigneeId === m.userId && t.status === 'done').length,
  }))
  const q = query.trim().toLowerCase()
  const visible = rows.filter((m) => (role === 'semua' || m.role === role) && (!q || `${m.name} ${m.email}`.toLowerCase().includes(q)))

  return (
    <div className="flex flex-col gap-6">
      <Topbar title={t('Tim', 'Team')} newLabel={t('Tambah anggota', 'Add member')} onNew={board?.role === 'admin' ? () => setInviting(true) : undefined} />
      <RequireBoard>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">{members.length} {t('anggota', members.length === 1 ? 'member' : 'members')}</p>
          <h1 className="text-[clamp(32px,4.5vw,48px)] leading-none font-semibold tracking-[-0.03em]">{t('Tim', 'Team')}</h1>
          <div className="flex flex-wrap items-center gap-3 text-lg text-muted-foreground"><BoardSwitcher /><span>{t('Siapa mengerjakan apa, dan seberapa penuh beban kerjanya.', 'Who’s working on what, and how full their plate is.')}</span></div>
        </div>
        {inviting && <InviteForm onInvite={addMember} onClose={() => setInviting(false)} />}
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative mr-auto flex max-w-[420px] min-w-[220px] flex-1 items-center">
            <Search size={20} strokeWidth={1.75} aria-hidden="true" className="pointer-events-none absolute left-4 text-muted-foreground" />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Cari anggota', 'Search members')} aria-label={t('Cari anggota', 'Search members')} className="h-11 pl-11" />
          </label>
          <SegmentedFilter label={t('Filter peran', 'Filter by role')} value={role} options={[['semua', t('Semua', 'All')], ['admin', tx(boardRoleLabel.admin)], ['member', tx(boardRoleLabel.member)]]} onChange={setRole} />
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">{visible.map((m) => <MemberCard key={m.userId} member={m} />)}</div>
        {!visible.length && <p className="rounded-card bg-card px-6 py-12 text-center text-base text-muted-foreground">{t('Tidak ada anggota yang cocok.', 'No matching members.')}</p>}
      </RequireBoard>
    </div>
  )
}
