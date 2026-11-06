import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FormField from '@/components/common/FormField'
import { type Task } from '@/data/dashboard'
import { useWorkspace } from '@/hooks/useWorkspace'
import { errorMessage } from '@/lib/errors'
import TagInput from './TagInput'
import { useI18n } from '@/hooks/useI18n'

const toInputDate = (d: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''
/** "2026-10-12" -> tengah malam waktu lokal (bukan UTC) agar tanggal tidak bergeser. */
const fromInputDate = (v: string) => (v ? new Date(Number(v.slice(0, 4)), Number(v.slice(5, 7)) - 1, Number(v.slice(8, 10))) : null)

type Errors = Partial<Record<'title' | 'description' | 'form', string>>

export default function TaskEditForm({ task, onDone }: { task: Task; onDone: () => void }) {
  const { members, updateTask, removeTask } = useWorkspace()
  const { t } = useI18n()
  const [tags, setTags] = useState(task.tags)
  const [progress, setProgress] = useState(task.pct)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const title = String(f.get('title') ?? '').trim()
    const description = String(f.get('description') ?? '').trim()
    const found: Errors = {}
    if (!title) found.title = t('Judul tidak boleh kosong.', 'Title can’t be empty.')
    else if (title.length > 200) found.title = t('Judul maksimal 200 karakter.', 'Title can be at most 200 characters.')
    if (description.length > 5000) found.description = t('Deskripsi maksimal 5000 karakter.', 'Description can be at most 5000 characters.')
    setErrors(found)
    if (Object.keys(found).length) return e.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`)?.focus()

    setBusy(true)
    try {
      await updateTask(task, { title, description, tags, dueDate: fromInputDate(String(f.get('dueDate') ?? '')), assigneeId: String(f.get('assigneeId')) || null, progress })
      onDone()
    } catch (err) {
      setErrors({ form: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try { await removeTask(task); onDone() } catch (err) { setErrors({ form: errorMessage(err) }); setBusy(false) }
  }

  const a11y = (k: 'title' | 'description') => ({ id: k, name: k, 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-err` : undefined })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormField id="title" label={t('Judul', 'Title')} error={errors.title}><Input {...a11y('title')} defaultValue={task.title} maxLength={200} autoFocus /></FormField>
      <FormField id="description" label={t('Deskripsi', 'Description')} error={errors.description}>
        <textarea {...a11y('description')} defaultValue={task.desc} rows={4} className="min-h-24 w-full resize-y rounded-image border-2 border-transparent bg-input px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring aria-invalid:border-destructive" />
      </FormField>
      <FormField id="tags" label="Tag"><TagInput id="tags" value={tags} onChange={setTags} /></FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="assigneeId" label={t('Penanggung jawab', 'Assignee')}>
          <select id="assigneeId" name="assigneeId" defaultValue={task.assigneeId ?? ''} className="h-12 rounded-image border-2 border-transparent bg-input px-4 text-base outline-none focus-visible:border-ring">
            <option value="">{t('Belum ditugaskan', 'Unassigned')}</option>
            {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
          </select>
        </FormField>
        <FormField id="dueDate" label={t('Tenggat', 'Due date')}><Input id="dueDate" name="dueDate" type="date" defaultValue={toInputDate(task.date)} /></FormField>
      </div>
      <FormField id="progress" label={`${t('Progres', 'Progress')}: ${progress}%`}>
        <input id="progress" type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="h-2 w-full cursor-pointer accent-primary" />
      </FormField>
      {errors.form && <p role="alert" className="text-sm leading-snug"><span className="mr-2 inline-block size-2 rounded-full bg-destructive" aria-hidden="true" />{errors.form}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={busy}>{busy ? t('Menyimpan…', 'Saving…') : t('Simpan', 'Save')}</Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={busy}>{t('Batal', 'Cancel')}</Button>
        <span className="ml-auto flex items-center gap-2">
          {confirmDelete
            ? <><span className="text-sm text-muted-foreground">{t('Hapus permanen?', 'Delete permanently?')}</span><Button type="button" variant="secondary" onClick={remove} disabled={busy}>{t('Ya, hapus', 'Yes, delete')}</Button><Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>{t('Tidak', 'No')}</Button></>
            : <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} disabled={busy}>{t('Hapus tugas', 'Delete task')}</Button>}
        </span>
      </div>
    </form>
  )
}
