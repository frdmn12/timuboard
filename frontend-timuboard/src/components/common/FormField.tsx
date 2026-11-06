import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

type Props = { id: string; label: string; error?: string; children: ReactNode }

export default function FormField({ id, label, error, children }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-base leading-snug font-medium">{label}</Label>
      {children}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-sm leading-snug">
          <span className="mr-2 inline-block size-2 rounded-full bg-destructive" aria-hidden="true" />{error}
        </p>
      )}
    </div>
  )
}
