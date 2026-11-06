import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'

type Props = { id: string; value: string[]; onChange: (tags: string[]) => void; max?: number; invalid?: boolean }

/** Input tag: Enter atau koma menambah, Backspace di kolom kosong menghapus tag terakhir. */
export default function TagInput({ id, value, onChange, max = 10, invalid }: Props) {
  const [draft, setDraft] = useState('')
  const { t: tr } = useI18n()

  const commit = () => {
    const tag = draft.trim().replace(/,$/, '').trim()
    if (tag && !value.includes(tag) && value.length < max) onChange([...value, tag])
    setDraft('')
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
    else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
  }

  return (
    <div className={cn('flex min-h-12 flex-wrap items-center gap-1.5 rounded-image border-2 border-transparent bg-input px-3 py-2 focus-within:border-ring', invalid && 'border-destructive')}>
      {value.map((t) => (
        <Badge key={t} size="sm" className="bg-background py-1 pr-1">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={tr(`Hapus tag ${t}`, `Remove tag ${t}`)} className="grid size-4 cursor-pointer place-items-center rounded-full hover:bg-secondary"><X size={12} strokeWidth={1.75} aria-hidden="true" /></button>
        </Badge>
      ))}
      <input id={id} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={commit} maxLength={30}
        placeholder={value.length ? '' : tr('Ketik tag, lalu Enter', 'Type a tag, then Enter')} disabled={value.length >= max} aria-label={tr('Tambah tag', 'Add tag')}
        className="min-w-[8ch] flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" />
    </div>
  )
}
