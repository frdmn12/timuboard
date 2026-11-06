import { useSeo } from '@/hooks/useSeo'
import { useI18n } from '@/hooks/useI18n'
import { useSearchParams } from 'react-router'
import AuthLayout from '@/components/auth/AuthLayout'
import VerifyEmailStatus from '@/components/auth/VerifyEmailStatus'

export default function Verifikasi() {
  const { t } = useI18n()
  useSeo({ title: t('Verifikasi email', 'Verify email'), noindex: true })
  const [params] = useSearchParams()
  return <AuthLayout motionKey="verifikasi"><VerifyEmailStatus token={params.get('token')} /></AuthLayout>
}
