import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import UserAvatar from '@/components/common/UserAvatar'
import { tintOf } from '@/data/dashboard'
import type { TaskComment } from '@/data/workspace'
import { formatRelative } from '@/lib/date'
import { errorMessage } from '@/lib/errors'
import { useI18n } from '@/hooks/useI18n'

type Props = { comment: TaskComment; onEdit: (id: string, body: string) => Promise<void>; onRemove: (id: string) => Promise<void> }

export default function CommentItem({ comment: c, onEdit, onRemove }: Props) {
  const { t, locale } = useI18n()
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm'>('view')
  const [draft, setDraft] = useState(c.body)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const name = c.author?.name ?? t('Anggota lama', 'Former member')

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('')
    try { await fn(); setMode('view') } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  const save = () => {
    const body = draft.trim()
    if (!body || body.length > 2000) return setError(t('Komentar harus 1 sampai 2000 karakter.', 'Comments must be 1 to 2000 characters.'))
    return run(() => onEdit(c.id, body))
  }

  return (
    <li className="flex gap-3">
      <UserAvatar name={name} tint={tintOf(name)} className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <b className="font-semibold">{name}</b>
          <time dateTime={c.createdAt} title={new Date(c.createdAt).toLocaleString(locale)} className="text-xs text-muted-foreground">{formatRelative(c.createdAt)}</time>
          {c.edited && <span className="text-xs text-muted-foreground">{t('(diedit)', '(edited)')}</span>}
        </div>

        {mode === 'edit' ? (
          <div className="flex flex-col gap-2">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus aria-label={t('Edit komentar', 'Edit comment')}
              onKeyDown={(e) => { if (e.key === 'Escape') { setMode('view'); setDraft(c.body) } }}
              className="min-h-20 w-full resize-y rounded-image border-2 border-transparent bg-input px-3 py-2 text-base text-foreground outline-none focus-visible:border-ring" />
            <div className="flex gap-2"><Button type="button" onClick={save} disabled={busy}>{busy ? t('Menyimpan…', 'Saving…') : t('Simpan', 'Save')}</Button><Button type="button" variant="ghost" onClick={() => { setMode('view'); setDraft(c.body); setError('') }} disabled={busy}>{t('Batal', 'Cancel')}</Button></div>
          </div>
        ) : (
          <p className="text-base leading-snug break-words whitespace-pre-wrap">{c.body}</p>
        )}

        {error && <p role="alert" className="text-sm">{error}</p>}

        {mode === 'view' && (c.canEdit || c.canDelete) && (
          <div className="flex gap-1 text-xs text-muted-foreground">
            {c.canEdit && <button type="button" onClick={() => setMode('edit')} className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 hover:bg-secondary hover:text-foreground"><Pencil size={12} strokeWidth={1.75} aria-hidden="true" />Edit</button>}
            {c.canDelete && <button type="button" onClick={() => setMode('confirm')} className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 hover:bg-secondary hover:text-foreground"><Trash2 size={12} strokeWidth={1.75} aria-hidden="true" />{t('Hapus', 'Delete')}</button>}
          </div>
        )}
        {mode === 'confirm' && (
          <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">{t('Hapus komentar ini?', 'Delete this comment?')}</span>
            <Button type="button" variant="secondary" onClick={() => run(() => onRemove(c.id))} disabled={busy}>{t('Ya, hapus', 'Yes, delete')}</Button>
            <Button type="button" variant="ghost" onClick={() => setMode('view')} disabled={busy}>{t('Tidak', 'No')}</Button></div>
        )}
      </div>
    </li>
  )
}
