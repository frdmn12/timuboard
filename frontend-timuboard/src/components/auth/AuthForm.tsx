import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router'
import { Link, useNavigate } from '@/lib/router'
import { MailWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FormField from '@/components/common/FormField'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/api'
import { errorCode, errorMessage } from '@/lib/errors'
import PasswordInput from './PasswordInput'
import GoogleButton from './GoogleButton'
import { useI18n } from '@/hooks/useI18n'
import { tt } from '@/lib/i18n'

export type Mode = 'login' | 'register'
type Errors = Partial<Record<'name' | 'email' | 'password' | 'form', string>>

const copy = (t: (id: string, en: string) => string) => ({
  login: { title: t('Selamat datang kembali.', 'Welcome back.'), sub: t('Masuk untuk melanjutkan ke papan tim Anda.', 'Sign in to continue to your team’s board.'), cta: t('Masuk', 'Sign in'), alt: [t('Belum punya akun?', 'No account yet?'), t('Daftar', 'Sign up'), '/daftar'] },
  register: { title: t('Mulai dalam semenit.', 'Get started in a minute.'), sub: t('Gratis untuk tim sampai 10 orang. Tanpa kartu kredit.', 'Free for teams of up to 10. No credit card.'), cta: t('Buat akun', 'Create account'), alt: [t('Sudah punya akun?', 'Have an account?'), t('Masuk', 'Sign in'), '/masuk'] },
})

const validate = (mode: Mode, v: Record<string, string>): Errors => {
  const e: Errors = {}
  if (mode === 'register' && !v.name.trim()) e.name = tt('Isi nama Anda.', 'Enter your name.')
  if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = tt('Masukkan alamat email yang valid, mis. nama@tim.id.', 'Enter a valid email address, e.g. name@team.com.')
  if (v.password.length < 8) e.password = tt('Kata sandi minimal 8 karakter.', 'Password must be at least 8 characters.')
  return e
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const { t } = useI18n()
  const c = copy(t)[mode]
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithGoogle, register, resendVerification } = useAuth()
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  const a11y = (k: 'name' | 'email' | 'password') => ({ id: k, name: k, 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-err` : undefined })
  const state = location.state as { verified?: boolean; passwordReset?: boolean } | null

  const submit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    const form = ev.currentTarget
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>
    v.email = v.email.trim().toLowerCase()
    const found = validate(mode, v)
    setErrors(found); setUnverifiedEmail(null); setResent(false)
    const first = Object.keys(found)[0]
    if (first) return form.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus()

    setBusy(true)
    try {
      if (mode === 'register') {
        await register(v.name.trim(), v.email, v.password)
        navigate('/cek-email', { state: { email: v.email } })
      } else {
        await login(v.email, v.password)
        navigate('/dashboard')
      }
    } catch (err) {
      const code = errorCode(err)
      if (code === 'EMAIL_NOT_VERIFIED') setUnverifiedEmail(v.email)
      else if (code === 'EMAIL_ALREADY_REGISTERED') setErrors({ email: errorMessage(err) })
      else if (err instanceof ApiError && err.status === 400 && Array.isArray(err.details)) setErrors({ form: t('Periksa kembali data Anda: ', 'Please check your details: ') + err.details.join(', ') })
      else setErrors({ form: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const handleGoogle = async (credential: string) => {
    setErrors({}); setUnverifiedEmail(null); setBusy(true)
    try { await loginWithGoogle(credential); navigate('/dashboard') }
    catch (err) { setErrors({ form: errorMessage(err) }); setBusy(false) }
  }

  const resend = async () => {
    if (!unverifiedEmail) return
    try { await resendVerification(unverifiedEmail); setResent(true) } catch (err) { setErrors({ form: errorMessage(err) }) }
  }

  return (
    <form data-m="form" onSubmit={submit} noValidate className="m-auto flex w-full max-w-[420px] flex-col gap-4 py-12">
      <h1 className="text-[clamp(36px,5vw,48px)] leading-none font-semibold tracking-[-0.03em] text-balance">{c.title}</h1>
      <p className="mb-2 text-lg leading-snug text-muted-foreground">{c.sub}</p>
      {state?.verified && <p role="status" className="rounded-image bg-card p-4 text-sm">{t('Email Anda sudah diverifikasi. Silakan masuk.', 'Your email is verified. Please sign in.')}</p>}
      {state?.passwordReset && <p role="status" className="rounded-image bg-card p-4 text-sm">{t('Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru.', 'Password changed. Sign in with your new password.')}</p>}
      {mode === 'register' && <FormField id="name" label={t('Nama lengkap', 'Full name')} error={errors.name}><Input {...a11y('name')} type="text" autoComplete="name" /></FormField>}
      <FormField id="email" label="Email" error={errors.email}><Input {...a11y('email')} type="email" autoComplete="email" /></FormField>
      <FormField id="password" label={t('Kata sandi', 'Password')} error={errors.password}><PasswordInput {...a11y('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></FormField>
      {mode === 'login' && <Button asChild variant="link" className="self-start p-0 text-sm"><Link to="/lupa-kata-sandi">{t('Lupa kata sandi?', 'Forgot password?')}</Link></Button>}
      {errors.form && <p role="alert" className="text-sm leading-snug"><span className="mr-2 inline-block size-2 rounded-full bg-destructive" aria-hidden="true" />{errors.form}</p>}
      {unverifiedEmail && (
        <div role="alert" className="flex flex-col gap-3 rounded-image bg-card p-4 text-sm">
          <p className="flex items-start gap-2"><MailWarning size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />{t('Email Anda belum diverifikasi. Buka tautan di email yang kami kirim saat Anda mendaftar.', 'Your email isn’t verified yet. Open the link in the email we sent when you signed up.')}</p>
          {resent ? <p role="status" className="text-muted-foreground">{t('Email verifikasi baru sudah dikirim ke', 'A new verification email was sent to')} {unverifiedEmail}.</p>
            : <Button type="button" variant="secondary" className="self-start bg-background" onClick={resend}>{t('Kirim ulang email verifikasi', 'Resend verification email')}</Button>}
        </div>
      )}
      <Button type="submit" size="lg" className="mt-2 w-full" disabled={busy}>{busy ? t('Memproses…', 'Working…') : c.cta}</Button>
      <div role="separator" className="flex items-center gap-4 text-sm">
        <span className="h-0.5 flex-1 rounded-full bg-card" />{t('atau', 'or')}<span className="h-0.5 flex-1 rounded-full bg-card" />
      </div>
      <GoogleButton onCredential={handleGoogle} />
      <p className="mt-2 text-center text-base text-muted-foreground">{c.alt[0]} <Link to={c.alt[2]} className="font-medium text-foreground underline underline-offset-4">{c.alt[1]}</Link></p>
    </form>
  )
}
