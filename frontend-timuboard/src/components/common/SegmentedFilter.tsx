import { cn } from '@/lib/utils'

type Props<T extends string> = { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }

/** Filter pil berbentuk grup tombol (aria-pressed). */
export default function SegmentedFilter<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-full bg-secondary p-1">
      {options.map(([id, text]) => (
        <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}
          className={cn('cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground', value === id && 'bg-background text-foreground')}>{text}</button>
      ))}
    </div>
  )
}
