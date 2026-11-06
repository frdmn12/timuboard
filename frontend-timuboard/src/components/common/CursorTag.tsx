import { tintOf } from '@/data/dashboard'

/** Panah kursor + label nama kolaborator; warna stabil per nama. Posisi dalam piksel relatif ke induk. */
export default function CursorTag({ name, x, y }: { name: string; x: number; y: number }) {
  const tint = tintOf(name)
  return (
    <div className="absolute top-0 left-0 flex items-start gap-0.5 transition-transform duration-75 ease-linear will-change-transform motion-reduce:transition-none"
      style={{ transform: `translate(${x}px, ${y}px)` }}>
      <svg viewBox="0 0 16 16" className="size-4 stroke-background stroke-[1.5]" style={{ fill: tint }}><path d="M1 1l5 14 2.2-5.8L14 7z" /></svg>
      <span className="mt-3 rounded-full px-2 py-1 text-xs leading-none font-medium whitespace-nowrap text-[#222326] shadow-lift" style={{ background: tint }}>{name}</span>
    </div>
  )
}
