import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FormField from '@/components/common/FormField'
import { boardRoleLabel, type Member } from '@/data/team'
import { errorMessage } from '@/lib/errors'
import { useI18n } from '@/hooks/useI18n'

type Props = { onInvite: (email: string, role: Member['role']) => Promise<void>; onClose: () => void }

export default function InviteForm({ onInvite, onClose }: Props) {
  const { t, tx } = useI18n()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email') ?? '').trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t('Masukkan alamat email yang valid.', 'Enter a valid email address.'))
    setError(''); setBusy(true)
    try { await onInvite(email, f.get('role') as Member['role']); onClose() } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-card bg-card p-6 sm:grid-cols-2">
      <h2 className="text-2xl leading-none font-semibold tracking-[-0.02em] sm:col-span-2">{t('Tambah anggota', 'Add member')}</h2>
      <p className="text-sm text-muted-foreground sm:col-span-2">{t('Orang yang ditambahkan harus sudah punya akun Timuboard.', 'The person you add must already have a Timuboard account.')}</p>
      <FormField id="email" label="Email" error={error}><Input id="email" name="email" type="email" autoFocus aria-invalid={!!error} aria-describedby={error ? 'email-err' : undefined} className="bg-background" onKeyDown={(e) => e.key === 'Escape' && onClose()} /></FormField>
      <FormField id="role" label={t('Peran di proyek', 'Project role')}>
        <select id="role" name="role" defaultValue="member" className="h-12 rounded-image border-2 border-transparent bg-background px-4 text-base outline-none focus-visible:border-ring">
          {(Object.keys(boardRoleLabel) as Member['role'][]).map((r) => <option key={r} value={r}>{tx(boardRoleLabel[r])}</option>)}
        </select>
      </FormField>
      <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? t('Menambahkan…', 'Adding…') : t('Tambah anggota', 'Add member')}</Button><Button type="button" variant="ghost" onClick={onClose}>{t('Batal', 'Cancel')}</Button></div>
    </form>
  )
}
