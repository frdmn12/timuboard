import { useSeo } from '@/hooks/useSeo'
import { useI18n } from '@/hooks/useI18n'
import { useSearchParams } from 'react-router'
import AuthLayout from '@/components/auth/AuthLayout'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export default function AturUlangKataSandi() {
  const { t } = useI18n()
  useSeo({ title: t('Atur ulang kata sandi', 'Reset password'), noindex: true })
  const [params] = useSearchParams()
  return <AuthLayout motionKey="atur-ulang"><ResetPasswordForm token={params.get('token')} /></AuthLayout>
}
