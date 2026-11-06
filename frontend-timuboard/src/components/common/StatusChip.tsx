import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** Titik membawa warna status; kata status selalu tertulis. */
export default function StatusChip({ label, dot }: { label: string; dot: string }) {
  return (
    <Badge>
      <span className={cn('size-2.5 rounded-full', dot)} aria-hidden="true" />
      {label}
    </Badge>
  )
}
