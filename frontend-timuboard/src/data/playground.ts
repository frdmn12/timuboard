import { statuses } from '@/data/dashboard'
import { Flame, Heart, PartyPopper, ThumbsUp, type LucideIcon } from 'lucide-react'
import type { Txt } from '@/lib/i18n'

export type DemoStatus = 'doing' | 'review' | 'done'

/** Kartu papan demo (contoh). Id dan status awal harus sama dengan DEMO_TASKS di backend. */
export const demoTasks: { id: string; title: Txt; tag: Txt }[] = [
  { id: 't1', title: ['Rapikan halaman harga', 'Tidy up the pricing page'], tag: ['Desain', 'Design'] },
  { id: 't2', title: ['Tulis ulang email sambutan', 'Rewrite the welcome email'], tag: ['Konten', 'Content'] },
  { id: 't3', title: ['Uji alur daftar di HP', 'Test sign-up on mobile'], tag: ['QA', 'QA'] },
  { id: 't4', title: ['Ilustrasi kosong untuk papan', 'Empty-state board illustration'], tag: ['Desain', 'Design'] },
  { id: 't5', title: ['Pasang analitik halaman', 'Add page analytics'], tag: ['Teknik', 'Engineering'] },
  { id: 't6', title: ['Kumpulkan masukan pengguna', 'Collect user feedback'], tag: ['Riset', 'Research'] },
]

/** Kolom papan demo: status Timuboard tanpa Todo (warna dan nama dari data papan asli). */
export const demoColumns = statuses.filter((s): s is (typeof statuses)[number] & { id: DemoStatus } => s.id !== 'todo')

export type ReactionKind = 'like' | 'love' | 'fire' | 'party'
export const reactions: { kind: ReactionKind; label: Txt; Icon: LucideIcon }[] = [
  { kind: 'like', label: ['Jempol', 'Thumbs up'], Icon: ThumbsUp },
  { kind: 'love', label: ['Suka', 'Love'], Icon: Heart },
  { kind: 'fire', label: ['Keren', 'Fire'], Icon: Flame },
  { kind: 'party', label: ['Rayakan', 'Celebrate'], Icon: PartyPopper },
]

/** Nama ruang dari nomor dari server (1, 2, …). Lewat dari daftar, nama berulang dengan angka: "Bali 2". */
const roomNames = ['Bali', 'Lombok', 'Flores', 'Sumba', 'Komodo', 'Belitung', 'Bangka', 'Nias', 'Seram', 'Buton', 'Alor', 'Rote', 'Bintan', 'Banda', 'Ternate', 'Tidore']
export const roomName = (n: number) => {
  if (n < 1) return '…'
  const name = roomNames[(n - 1) % roomNames.length]
  const round = Math.floor((n - 1) / roomNames.length) + 1
  return round > 1 ? `${name} ${round}` : name
}

/** Zona waktu perangkat; tidak butuh izin, tapi hanya perkiraan kasar. */
export const deviceTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null } catch { return null } }

const indonesia: Record<string, string> = { 'Asia/Jakarta': 'WIB', 'Asia/Pontianak': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' }
/** Label lokasi dari zona waktu IANA: "Indonesia · WITA", atau nama kota zona ("Asia/Tokyo" = "Tokyo"). */
export const tzLabel = (tz: string) => indonesia[tz] ? `Indonesia · ${indonesia[tz]}` : tz.split('/').pop()!.replace(/_/g, ' ')
