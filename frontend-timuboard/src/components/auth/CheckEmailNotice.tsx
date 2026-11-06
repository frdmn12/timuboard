import { useState } from 'react'
import { Link } from '@/lib/router'
import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { errorMessage } from '@/lib/errors'
import { useI18n } from '@/hooks/useI18n'

export default function CheckEmailNotice({ email }: { email: string }) {
  const { resendVerification } = useAuth()
  const { t } = useI18n()
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')

  const resend = async () => {
    setState('sending'); setError('')
    try { await resendVerification(email); setState('sent') } catch (err) { setError(errorMessage(err)); setState('idle') }
  }

  return (
    <div data-m="form" className="m-auto flex w-full max-w-[420px] flex-col gap-4 py-12">
      <MailCheck size={32} strokeWidth={1.75} aria-hidden="true" />
      <h1 className="text-[clamp(36px,5vw,48px)] leading-none font-semibold tracking-[-0.03em] text-balance">{t('Cek email Anda.', 'Check your email.')}</h1>
      <p className="text-lg leading-snug text-muted-foreground">{t('Akun Anda sudah dibuat. Kami mengirim tautan verifikasi ke', 'Your account is ready. We sent a verification link to')} <b className="font-medium text-foreground">{email}</b>. {t('Buka tautan itu untuk mengaktifkan akun, lalu masuk.', 'Open it to activate your account, then sign in.')}</p>
      {error && <p role="alert" className="text-sm">{error}</p>}
      {state === 'sent' && <p role="status" className="rounded-image bg-card p-4 text-sm">{t('Email verifikasi baru sudah dikirim.', 'A new verification email is on its way.')}</p>}
      <div className="flex flex-wrap gap-2">
        <Button asChild><Link to="/masuk">{t('Ke halaman masuk', 'Go to sign in')}</Link></Button>
        <Button type="button" variant="secondary" onClick={resend} disabled={state === 'sending'}>{state === 'sending' ? t('Mengirim…', 'Sending…') : t('Kirim ulang email', 'Resend email')}</Button>
      </div>
      <p className="text-sm text-muted-foreground">{t('Tidak ada email? Periksa folder spam. Tautan berlaku 24 jam.', 'No email? Check your spam folder. The link is valid for 24 hours.')}</p>
    </div>
  )
}
