import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@/lib/router'
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useI18n } from '@/hooks/useI18n'
import { tt } from '@/lib/i18n'

type State = { kind: 'loading' } | { kind: 'ok' } | { kind: 'error'; message: string }

/** Memverifikasi token dari tautan email (POST /auth/verify-email) dan menampilkan hasilnya. */
export default function VerifyEmailStatus({ token }: { token: string | null }) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [state, setState] = useState<State>(token ? { kind: 'loading' } : { kind: 'error', message: tt('Tautan verifikasi tidak lengkap.', 'The verification link is incomplete.') })

  useEffect(() => {
    if (!token) return
    let active = true
    api('/auth/verify-email', 'POST', { token })
      .then(() => active && setState({ kind: 'ok' }))
      .catch((err) => active && setState({ kind: 'error', message: errorMessage(err) }))
    return () => { active = false }
  }, [token])

  return (
    <div data-m="form" className="m-auto flex w-full max-w-[420px] flex-col gap-4 py-12" aria-live="polite">
      {state.kind === 'loading' && (<>
        <LoaderCircle size={32} strokeWidth={1.75} aria-hidden="true" className="animate-spin" />
        <h1 className="text-[clamp(36px,5vw,48px)] leading-none font-semibold tracking-[-0.03em]">{t('Memverifikasi…', 'Verifying…')}</h1>
      </>)}
      {state.kind === 'ok' && (<>
        <CircleCheck size={32} strokeWidth={1.75} aria-hidden="true" color="var(--recovery-green)" />
        <h1 className="text-[clamp(36px,5vw,48px)] leading-none font-semibold tracking-[-0.03em] text-balance">{t('Email terverifikasi.', 'Email verified.')}</h1>
        <p className="text-lg text-muted-foreground">{t('Akun Anda aktif. Silakan masuk untuk mulai memakai Timuboard.', 'Your account is active. Sign in to start using Timuboard.')}</p>
        <Button className="self-start" onClick={() => navigate('/masuk', { state: { verified: true } })}>{t('Masuk', 'Sign in')}</Button>
      </>)}
      {state.kind === 'error' && (<>
        <CircleAlert size={32} strokeWidth={1.75} aria-hidden="true" />
        <h1 className="text-[clamp(36px,5vw,48px)] leading-none font-semibold tracking-[-0.03em] text-balance">{t('Verifikasi gagal.', 'Verification failed.')}</h1>
        <p role="alert" className="text-lg text-muted-foreground">{state.message}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/masuk">{t('Ke halaman masuk', 'Go to sign in')}</Link></Button>
          <Button asChild variant="secondary"><Link to="/daftar">{t('Daftar lagi', 'Sign up again')}</Link></Button>
        </div>
        <p className="text-sm text-muted-foreground">{t('Sudah mendaftar tapi tautan kedaluwarsa? Coba masuk, lalu pilih kirim ulang email verifikasi.', 'Signed up but the link expired? Try signing in, then choose to resend the verification email.')}</p>
      </>)}
    </div>
  )
}
