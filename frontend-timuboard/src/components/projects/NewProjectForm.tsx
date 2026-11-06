import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FormField from '@/components/common/FormField'
import { errorMessage } from '@/lib/errors'
import { useI18n } from '@/hooks/useI18n'

type Props = { onCreate: (name: string, desc: string) => Promise<unknown>; onClose: () => void }

export default function NewProjectForm({ onCreate, onClose }: Props) {
  const { t } = useI18n()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const name = String(f.get('name') ?? '').trim()
    if (!name) return setError(t('Isi nama proyek.', 'Enter a project name.'))
    setError(''); setBusy(true)
    try { await onCreate(name, String(f.get('desc') ?? '').trim()); onClose() } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-card bg-card p-6">
      <h2 className="text-2xl leading-none font-semibold tracking-[-0.02em]">{t('Proyek baru', 'New project')}</h2>
      <FormField id="name" label={t('Nama proyek', 'Project name')} error={error}><Input id="name" name="name" autoFocus aria-invalid={!!error} aria-describedby={error ? 'name-err' : undefined} onKeyDown={(e) => e.key === 'Escape' && onClose()} className="bg-background" /></FormField>
      <FormField id="desc" label={t('Deskripsi (opsional)', 'Description (optional)')}><Input id="desc" name="desc" className="bg-background" /></FormField>
      <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? t('Membuat…', 'Creating…') : t('Buat proyek', 'Create project')}</Button><Button type="button" variant="ghost" onClick={onClose}>{t('Batal', 'Cancel')}</Button></div>
    </form>
  )
}
