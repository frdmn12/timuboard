import { useState, type FormEvent } from 'react'
import { Link } from '@/lib/router'
import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FormField from '@/components/common/FormField'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useI18n } from '@/hooks/useI18n'

export default function ForgotPasswordForm() {
  const { t } = useI18n()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email')).trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError(t('Masukkan alamat email yang valid, mis. nama@tim.id.', 'Enter a valid email address, e.g. name@team.com.'))
    setError(''); setBusy(true)
    try {
      await api('/auth/forgot-password', 'POST', { email })
      setSentTo(email)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <div data-m="form" className="m-auto flex w-full max-w-[420px] flex-col gap-4 py-12" aria-live="polite">
        <MailCheck size={32} strokeWidth={1.75} aria-hidden="true" />
        <h1 className="text-[clamp(36px,5vw,48px)] leading-none font-semibold tracking-[-0.03em] text-balance">{t('Cek email Anda.', 'Check your email.')}</h1>
        <p className="text-lg leading-snug text-muted-foreground">{t('Jika', 'If')} <b className="font-medium text-foreground">{sentTo}</b> {t('terdaftar, kami sudah mengirim tautan untuk mengatur ulang kata sandi. Tautan berlaku 60 menit.', 'has an account, we sent a link to reset your password. The link is valid for 60 minutes.')}</p>
        <p className="text-sm text-muted-foreground">{t('Tidak ada email? Periksa folder spam, atau coba lagi beberapa menit lagi.', 'No email? Check your spam folder, or try again in a few minutes.')}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/masuk">{t('Kembali ke halaman masuk', 'Back to sign in')}</Link></Button>
          <Button type="button" variant="secondary" onClick={() => setSentTo(null)}>{t('Pakai email lain', 'Use another email')}</Button>
        </div>
      </div>
    )
  }

  return (
    <form data-m="form" onSubmit={submit} noValidate className="m-auto flex w-full max-w-[420px] flex-col gap-4 py-12">
      <h1 className="text-[clamp(36px,5vw,48px)] leading-none font-semibold tracking-[-0.03em] text-balance">{t('Lupa kata sandi?', 'Forgot your password?')}</h1>
      <p className="mb-2 text-lg leading-snug text-muted-foreground">{t('Masukkan email akun Anda. Kami kirim tautan untuk membuat kata sandi baru.', 'Enter your account email. We’ll send a link to create a new password.')}</p>
      <FormField id="email" label="Email" error={error}>
        <Input id="email" name="email" type="email" autoComplete="email" autoFocus aria-invalid={!!error} aria-describedby={error ? 'email-err' : undefined} />
      </FormField>
      <Button type="submit" size="lg" className="mt-2 w-full" disabled={busy}>{busy ? t('Mengirim…', 'Sending…') : t('Kirim tautan', 'Send link')}</Button>
      <p className="mt-2 text-center text-base text-muted-foreground">{t('Ingat kata sandi?', 'Remember your password?')} <Link to="/masuk" className="font-medium text-foreground underline underline-offset-4">{t('Masuk', 'Sign in')}</Link></p>
    </form>
  )
}
