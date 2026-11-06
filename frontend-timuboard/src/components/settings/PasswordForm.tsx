import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import FormField from '@/components/common/FormField'
import PasswordInput from '@/components/auth/PasswordInput'
import { useI18n } from '@/hooks/useI18n'

type Errors = Partial<Record<'current' | 'next', string>>

export default function PasswordForm() {
  const [errors, setErrors] = useState<Errors>({})
  const { t } = useI18n()
  const [done, setDone] = useState(false)
  const a11y = (k: keyof Errors) => ({ id: k, name: k, 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-err` : undefined })

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const found: Errors = {}
    if (!String(f.get('current'))) found.current = t('Masukkan kata sandi saat ini.', 'Enter your current password.')
    if (String(f.get('next')).length < 8) found.next = t('Kata sandi baru minimal 8 karakter.', 'New password must be at least 8 characters.')
    setErrors(found); setDone(false)
    if (Object.keys(found).length) return
    // ponytail: belum ada backend; ganti dengan panggilan API ubah kata sandi.
    e.currentTarget.reset(); setDone(true)
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormField id="current" label={t('Kata sandi saat ini', 'Current password')} error={errors.current}><PasswordInput {...a11y('current')} autoComplete="current-password" className="bg-background" /></FormField>
      <FormField id="next" label={t('Kata sandi baru', 'New password')} error={errors.next}><PasswordInput {...a11y('next')} autoComplete="new-password" className="bg-background" /></FormField>
      <div className="flex items-center gap-4"><Button type="submit">{t('Ubah kata sandi', 'Change password')}</Button>{done && <p role="status" className="text-sm text-muted-foreground">{t('Formulir valid. Belum terhubung ke server, jadi kata sandi belum berubah.', 'Form is valid. It isn’t connected to the server yet, so your password hasn’t changed.')}</p>}</div>
    </form>
  )
}
