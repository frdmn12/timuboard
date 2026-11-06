import type { ReactNode } from 'react'
import { Link } from '@/lib/router'
import { FolderKanban, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useI18n } from '@/hooks/useI18n'

/** Menampilkan konten hanya bila ada proyek aktif; selain itu keadaan memuat atau ajakan membuat proyek. */
export default function RequireBoard({ children }: { children: ReactNode }) {
  const { load, board } = useWorkspace()
  const { t } = useI18n()
  if (load === 'loading') {
    return <div className="grid place-items-center py-24" role="status" aria-label={t('Memuat', 'Loading')}><LoaderCircle size={28} strokeWidth={1.75} className="animate-spin text-muted-foreground" aria-hidden="true" /></div>
  }
  if (!board) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card bg-card px-6 py-16 text-center">
        <FolderKanban size={24} strokeWidth={1.75} aria-hidden="true" className="text-muted-foreground" />
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">{t('Belum ada proyek', 'No projects yet')}</h2>
        <p className="max-w-[28em] text-base text-muted-foreground">{t('Buat proyek pertama Anda untuk mulai mencatat tugas dan mengundang tim.', 'Create your first project to start tracking tasks and inviting your team.')}</p>
        <Button asChild className="mt-2"><Link to="/proyek">{t('Buat proyek', 'Create project')}</Link></Button>
      </div>
    )
  }
  return <>{children}</>
}
