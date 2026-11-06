import { useSeo } from '@/hooks/useSeo'
import { useI18n } from '@/hooks/useI18n'
import AuthLayout from '@/components/auth/AuthLayout'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export default function LupaKataSandi() {
  const { t } = useI18n()
  useSeo({ title: t('Lupa kata sandi', 'Forgot password'), noindex: true })
  return <AuthLayout motionKey="lupa"><ForgotPasswordForm /></AuthLayout>
}
