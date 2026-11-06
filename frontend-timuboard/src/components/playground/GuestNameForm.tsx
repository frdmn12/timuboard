import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/hooks/useI18n'

/** Ganti nama tamu; tersimpan di browser untuk kunjungan berikutnya. Pasang `key={name}` agar isian ikut nama dari server. */
export default function GuestNameForm({ name, onRename }: { name: string; onRename: (n: string) => Promise<boolean> }) {
  const [value, setValue] = useState(name)
  const { t } = useI18n()
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return setError(t('Nama tidak boleh kosong.', 'Name can’t be empty.'))
    setError((await onRename(value)) ? '' : t('Nama belum tersimpan. Coba lagi sebentar.', 'Name not saved yet. Try again in a moment.'))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <Label htmlFor="guest-name">{t('Namamu di sini', 'Your name here')}</Label>
      <div className="flex gap-2">
        <Input id="guest-name" value={value} maxLength={24} onChange={(e) => setValue(e.target.value)} aria-invalid={!!error || undefined} aria-describedby={error ? 'guest-name-error' : undefined} />
        <Button type="submit" variant="secondary" disabled={!name || value.trim() === name}>{t('Simpan', 'Save')}</Button>
      </div>
      {error && <p id="guest-name-error" role="alert" className="text-sm">{error}</p>}
    </form>
  )
}
