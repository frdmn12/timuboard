export type Status = 'todo' | 'doing' | 'review' | 'done'

/** Tugas dalam bentuk yang dipakai UI (dipetakan dari respons API). */
export type Task = {
  id: string
  boardId: string
  title: string
  desc: string
  tags: string[]
  status: Status
  /** Persentase penyelesaian 0-100. */
  pct: number
  /** Nama penanggung jawab; kosong bila belum ditugaskan. */
  who: string
  assigneeId: string | null
  /** Tenggat; null bila tidak ada. */
  date: Date | null
  pinned: boolean
  /** Jumlah komentar. */
  commentCount: number
}

// Kelas Tailwind ditulis utuh agar terdeteksi; wash = warna status lembut di permukaan pucat.
export const statuses: { id: Status; name: string; dot: string; bar: string; wash: string; pct: number }[] = [
  { id: 'todo', name: 'Todo', dot: 'bg-status-todo', bar: 'bg-status-todo', wash: 'bg-status-todo/15', pct: 0 },
  { id: 'doing', name: 'Doing', dot: 'bg-status-doing', bar: 'bg-status-doing', wash: 'bg-status-doing/15', pct: 25 },
  { id: 'review', name: 'Review', dot: 'bg-status-review', bar: 'bg-status-review', wash: 'bg-status-review/25', pct: 90 },
  { id: 'done', name: 'Done', dot: 'bg-status-done', bar: 'bg-status-done', wash: 'bg-status-done/15', pct: 100 },
]

export const nextStatus = (s: Status): Status | null => statuses[statuses.findIndex((x) => x.id === s) + 1]?.id ?? null

const tints = ['var(--sleep-lilac)', 'var(--coral-signal)', 'var(--sky-top)', '#c8f0b8']
/** Warna avatar stabil per nama: nama yang sama selalu berwarna sama di semua halaman. */
export const tintOf = (name: string) => {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return tints[h % tints.length]
}
