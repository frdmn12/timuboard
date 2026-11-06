import { useSeo } from '@/hooks/useSeo'
import { useI18n } from '@/hooks/useI18n'
import AuthLayout from '@/components/auth/AuthLayout'
import AuthForm, { type Mode } from '@/components/auth/AuthForm'

export default function Auth({ mode }: { mode: Mode }) {
  const { t } = useI18n()
  useSeo(mode === 'login'
    ? { title: t('Masuk', 'Sign in'), path: '/masuk', description: t('Masuk ke Timuboard untuk membuka papan kerja timmu.', 'Sign in to Timuboard to open your team’s board.') }
    : { title: t('Daftar', 'Sign up'), path: '/daftar', description: t('Buat akun Timuboard dan mulai papan kerja pertama untuk timmu.', 'Create a Timuboard account and start your team’s first board.') })
  return (
    <AuthLayout motionKey={mode}>
      <AuthForm mode={mode} />
    </AuthLayout>
  )
}
