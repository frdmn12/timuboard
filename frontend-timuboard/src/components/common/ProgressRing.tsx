import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type Props = { value: number; color: string; animate?: boolean; className?: string }

/** Cincin progres; `animate` membiarkan hook motion mengisi --p dan teksnya. */
export default function ProgressRing({ value, color, animate, className }: Props) {
  return (
    <div
      data-m={animate ? 'ring' : undefined}
      data-ring={animate ? value : undefined}
      style={{ '--c': color, '--p': value } as CSSProperties}
      className={cn('grid size-[72px] shrink-0 place-items-center rounded-full bg-[conic-gradient(var(--c)_calc(var(--p)*1%),var(--background)_0)] text-base font-semibold', className)}
    >
      <em className="grid size-[54px] place-items-center rounded-full bg-card not-italic">{value}%</em>
    </div>
  )
}
