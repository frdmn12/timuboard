import { Link } from '@/lib/router'
import { cn } from '@/lib/utils'
import LogoMark from './LogoMark'

/** `compact`: di layar ≤420px hanya ikon (nama tetap terbaca pembaca layar), agar navbar muat di HP. */
export default function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5 text-lg font-medium tracking-[0.009em]', className)}>
      <LogoMark className="size-7" aria-hidden="true" /><span className={cn(compact && 'max-[420px]:sr-only')}>Timuboard</span>
    </Link>
  )
}
