import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/hooks/useI18n'

export default function PasswordInput(props: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [show, setShow] = useState(false)
  const { t } = useI18n()
  const Icon = show ? EyeOff : Eye
  return (
    <div className="relative flex">
      <Input {...props} type={show ? 'text' : 'password'} className="pr-14" />
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShow(!show)} aria-pressed={show} aria-label={show ? t('Sembunyikan kata sandi', 'Hide password') : t('Tampilkan kata sandi', 'Show password')} className="absolute top-1/2 right-3 -translate-y-1/2">
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
      </Button>
    </div>
  )
}
