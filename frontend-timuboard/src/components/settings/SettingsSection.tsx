import type { ReactNode } from 'react'

type Props = { title: string; desc: string; children: ReactNode }

/** Bagian pengaturan: judul dan penjelasan di kiri, kontrol di kanan. */
export default function SettingsSection({ title, desc, children }: Props) {
  return (
    <section aria-label={title} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 rounded-card bg-card p-6 max-[900px]:grid-cols-1">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl leading-tight font-semibold tracking-[-0.02em]">{title}</h2>
        <p className="text-sm leading-snug text-muted-foreground">{desc}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  )
}
