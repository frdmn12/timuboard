import { useEffect, useState } from 'react'
import { LoaderCircle, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useWorkspace } from '@/hooks/useWorkspace'
import Topbar from '@/components/dashboard/Topbar'
import SegmentedFilter from '@/components/common/SegmentedFilter'
import ProjectCard, { projectStatus } from '@/components/projects/ProjectCard'
import NewProjectForm from '@/components/projects/NewProjectForm'
import { useI18n } from '@/hooks/useI18n'

type Filter = 'semua' | 'aktif' | 'selesai'

export default function Proyek() {
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Filter>('semua')
  const { boards, load, createBoard, refreshBoards } = useWorkspace()
  const { t } = useI18n()

  // Statistik papan (jumlah tugas, progres) disegarkan setiap halaman ini dibuka.
  useEffect(() => { void refreshBoards().catch(() => undefined) }, [refreshBoards])

  const q = query.trim().toLowerCase()
  const visible = boards.filter((b) => (status === 'semua' || projectStatus(b) === status) && (!q || `${b.name} ${b.description ?? ''}`.toLowerCase().includes(q)))

  return (
    <div className="flex flex-col gap-6">
      <Topbar title={t('Proyek', 'Projects')} newLabel={t('Proyek baru', 'New project')} onNew={() => setCreating(true)} />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">{boards.length} {t('proyek', boards.length === 1 ? 'project' : 'projects')}</p>
        <h1 className="text-[clamp(32px,4.5vw,48px)] leading-none font-semibold tracking-[-0.03em]">{t('Proyek', 'Projects')}</h1>
        <p className="text-lg text-muted-foreground">{t('Semua pekerjaan tim, dikelompokkan per proyek.', 'All of your team’s work, grouped by project.')}</p>
      </div>
      {creating && <NewProjectForm onCreate={createBoard} onClose={() => setCreating(false)} />}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative mr-auto flex max-w-[420px] min-w-[220px] flex-1 items-center">
          <Search size={20} strokeWidth={1.75} aria-hidden="true" className="pointer-events-none absolute left-4 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Cari proyek', 'Search projects')} aria-label={t('Cari proyek', 'Search projects')} className="h-11 pl-11" />
        </label>
        <SegmentedFilter label={t('Filter status proyek', 'Filter by project status')} value={status} options={[['semua', t('Semua', 'All')], ['aktif', t('Aktif', 'Active')], ['selesai', t('Selesai', 'Completed')]]} onChange={setStatus} />
      </div>
      {load === 'loading' ? <div className="grid place-items-center py-16" role="status" aria-label={t('Memuat', 'Loading')}><LoaderCircle size={28} strokeWidth={1.75} className="animate-spin text-muted-foreground" aria-hidden="true" /></div> : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">{visible.map((b) => <ProjectCard key={b.id} board={b} />)}</div>
      )}
      {load !== 'loading' && !visible.length && <p className="rounded-card bg-card px-6 py-12 text-center text-base text-muted-foreground">{boards.length ? t('Tidak ada proyek yang cocok.', 'No matching projects.') : t('Belum ada proyek. Buat proyek pertama Anda dengan tombol "Proyek baru".', 'No projects yet. Create your first one with the "New project" button.')}</p>}
    </div>
  )
}
