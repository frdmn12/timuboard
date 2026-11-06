import type { ComponentProps } from 'react'
import { useNavigate } from '@/lib/router'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'

/** Keluar: mencabut sesi di server lalu kembali ke halaman masuk. */
export default function LogoutButton(props: Omit<ComponentProps<typeof Button>, 'onClick' | 'children'>) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useI18n()
  return (
    <Button {...props} onClick={async () => { await logout(); navigate('/masuk') }}>
      <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />{t('Keluar', 'Sign out')}
    </Button>
  )
}
