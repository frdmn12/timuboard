import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export default function UserAvatar({ name, tint, size = 'sm', className }: { name: string; tint: string; size?: 'sm' | 'default'; className?: string }) {
  return (
    <Avatar size={size} className={cn('size-7', className)} aria-hidden="true">
      <AvatarFallback className="text-xs font-semibold text-[#222326]" style={{ background: tint }}>{name[0]}</AvatarFallback>
    </Avatar>
  )
}
