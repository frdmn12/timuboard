import { useSeo } from '@/hooks/useSeo'
import { useI18n } from '@/hooks/useI18n'
import { useLocation } from 'react-router'
import { Navigate } from '@/lib/router'
import AuthLayout from '@/components/auth/AuthLayout'
import CheckEmailNotice from '@/components/auth/CheckEmailNotice'

export default function CekEmail() {
  const { t } = useI18n()
  useSeo({ title: t('Cek email', 'Check your email'), noindex: true })
  const email = (useLocation().state as { email?: string } | null)?.email
  if (!email) return <Navigate to="/daftar" replace />
  return <AuthLayout motionKey="cek-email"><CheckEmailNotice email={email} /></AuthLayout>
}
