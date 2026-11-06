/** Logo merek (Simple Icons) satu warna, mengikuti warna teks. */
export default function BrandIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true" className={className ?? 'size-6'} fill="currentColor"><path d={path} /></svg>
  )
}
