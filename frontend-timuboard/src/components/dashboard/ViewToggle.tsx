import { Columns3, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Txt } from '@/lib/i18n'
import { useI18n } from '@/hooks/useI18n'

export type View = 'grid' | 'columns'
const opts: [View, Txt, typeof LayoutGrid][] = [['columns', ['Tampilan kolom', 'Column view'], Columns3], ['grid', ['Tampilan kisi', 'Grid view'], LayoutGrid]]

export default function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const { t, tx } = useI18n()
  return (
    <div role="group" aria-label={t('Tampilan papan', 'Board view')} className="flex rounded-full bg-secondary p-1">
      {opts.map(([id, label, Icon]) => (
        <button key={id} type="button" aria-label={tx(label)} aria-pressed={view === id} onClick={() => onChange(id)}
          className={cn('grid size-8 cursor-pointer place-items-center rounded-full text-muted-foreground', view === id && 'bg-background text-foreground')}>
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
