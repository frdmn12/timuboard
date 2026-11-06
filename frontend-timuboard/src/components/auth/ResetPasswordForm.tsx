import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@/lib/router'
import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import FormField from '@/components/common/FormField'
import { api } from '@/lib/api'
import { errorCode, errorMessage } from '@/lib/errors'
import PasswordInput from './PasswordInput'
import { useI18n } from '@/hooks/useI18n'

export default function ResetPasswordForm({ token }: { token: string | null }) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState(!token)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const password = String(f.get('password')), confirm = String(f.get('confirm'))
    if (password.length < 8) return setError(t('Kata sandi minimal 8 karakter.', 'Password must be at least 8 characters.'))
    if (password !== confirm) return setError(t('Konfirmasi kata sandi tidak sama.', 'Passwords don’t match.'))
    setError(''); setBusy(true)
    try {
      await api('/auth/reset-password', 'POST', { token, password })
      navigate('/masuk', { state: { passwordReset: true } })
    } catch (err) {
      if (errorCode(err) === 'INVALID_OR_EXPIRED_TOKEN') setInvalid(true)
      else setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (invalid) {
    return (
      <div data-m="form" className="m-auto flex w-full max-w-[420px] flex-col gap-4 py-12" aria-live="polite">
        <CircleAlert size={32} strokeWidth={1.75} aria-hidden="true" />
        <h1 className="text-[clamp(36px,5vw,48px)] leading-none font-semibold tracking-[-0.03em] text-balance">{t('Tautan tidak berlaku.', 'This link is no longer valid.')}</h1>
        <p role="alert" className="text-lg leading-snug text-muted-foreground">{t('Tautan atur ulang kata sandi tidak valid, sudah dipakai, atau sudah kedaluwarsa. Minta tautan baru.', 'The password reset link is invalid, already used, or expired. Request a new one.')}</p>
        <Button asChild className="self-start"><Link to="/lupa-kata-sandi">{t('Minta tautan baru', 'Request a new link')}</Link></Button>
      </div>
    )
  }

  return (
    <form data-m="form" onSubmit={submit} noValidate className="m-auto flex w-full max-w-[420px] flex-col gap-4 py-12">
      <h1 className="text-[clamp(36px,5vw,48px)] leading-none font-semibold tracking-[-0.03em] text-balance">{t('Buat kata sandi baru.', 'Create a new password.')}</h1>
      <p className="mb-2 text-lg leading-snug text-muted-foreground">{t('Setelah disimpan, semua perangkat akan keluar dan Anda perlu masuk lagi.', 'Once saved, every device is signed out and you’ll need to sign in again.')}</p>
      <FormField id="password" label={t('Kata sandi baru', 'New password')} error={error}>
        <PasswordInput id="password" name="password" autoComplete="new-password" autoFocus aria-invalid={!!error} aria-describedby={error ? 'password-err' : undefined} />
      </FormField>
      <FormField id="confirm" label={t('Ulangi kata sandi baru', 'Repeat new password')}><PasswordInput id="confirm" name="confirm" autoComplete="new-password" /></FormField>
      <Button type="submit" size="lg" className="mt-2 w-full" disabled={busy}>{busy ? t('Menyimpan…', 'Saving…') : t('Simpan kata sandi', 'Save password')}</Button>
    </form>
  )
}
