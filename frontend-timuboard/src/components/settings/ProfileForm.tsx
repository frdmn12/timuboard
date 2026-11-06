import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FormField from '@/components/common/FormField'
import UserAvatar from '@/components/common/UserAvatar'
import { roles } from '@/data/team'
import { useProfile } from '@/hooks/useProfile'
import { useI18n } from '@/hooks/useI18n'

export default function ProfileForm() {
  const { profile, saveRole } = useProfile()
  const { t, tx } = useI18n()
  const [saved, setSaved] = useState(false)

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    saveRole(String(new FormData(e.currentTarget).get('role')))
    setSaved(true)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-4"><UserAvatar name={profile.name || '?'} tint="var(--sleep-lilac)" size="default" className="size-14 text-lg" /><p className="text-sm text-muted-foreground">{t('Inisial avatar mengikuti nama akun Anda.', 'Your avatar initial follows your account name.')}</p></div>
      <FormField id="name" label={t('Nama lengkap', 'Full name')}><Input id="name" value={profile.name} readOnly className="bg-background" /></FormField>
      <FormField id="email" label="Email"><Input id="email" type="email" value={profile.email} readOnly className="bg-background" /></FormField>
      <p className="text-sm text-muted-foreground">{t('Nama dan email berasal dari akun Anda. Mengubahnya belum tersedia.', 'Name and email come from your account. Changing them isn’t available yet.')}</p>
      <FormField id="role" label={t('Peran', 'Role')}>
        <select id="role" name="role" defaultValue={profile.role} onChange={() => setSaved(false)} className="h-12 rounded-image border-2 border-transparent bg-background px-4 text-base outline-none focus-visible:border-ring">
          {roles.map((r) => <option key={r.value} value={r.value}>{tx(r.label)}</option>)}
        </select>
      </FormField>
      <div className="flex items-center gap-4"><Button type="submit">{t('Simpan peran', 'Save role')}</Button>{saved && <p role="status" className="text-sm text-muted-foreground">{t('Peran tersimpan.', 'Role saved.')}</p>}</div>
    </form>
  )
}
