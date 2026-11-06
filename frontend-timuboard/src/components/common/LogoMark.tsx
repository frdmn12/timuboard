import { cn } from '@/lib/utils'

/** Tanda logo Timuboard: tiga kolom papan (Doing, Review, Done) pada ubin charcoal. */
export default function LogoMark({ className, ...rest }: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" role="img" aria-label="Timuboard" className={cn("size-8", className)} {...rest}>
      <rect width="32" height="32" rx="10" className="fill-primary" />
      <rect x="7" y="9" width="5" height="14" rx="2.5" fill="var(--metric-blue)" />
      <rect x="13.5" y="9" width="5" height="9" rx="2.5" fill="var(--sleep-lilac)" />
      <rect x="20" y="9" width="5" height="11" rx="2.5" fill="var(--recovery-green)" />
    </svg>
  )
}
