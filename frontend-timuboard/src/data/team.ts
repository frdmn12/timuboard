import type { Txt } from '@/lib/i18n'

/** Anggota papan (dari API). `role` adalah peran di papan, bukan jabatan. */
export type Member = { userId: string; name: string; email: string; role: 'admin' | 'member'; isOwner: boolean }

export const boardRoleLabel: Record<Member['role'], Txt> = { admin: ['Admin', 'Admin'], member: ['Anggota', 'Member'] }

/** Daftar jabatan untuk pengaturan profil (disimpan lokal dengan nilai Indonesia; belum ada API). */
export const roles: { value: string; label: Txt }[] = [
  { value: 'Desainer', label: ['Desainer', 'Designer'] },
  { value: 'Manajer produk', label: ['Manajer produk', 'Product manager'] },
  { value: 'Konten', label: ['Konten', 'Content'] },
  { value: 'Pengembang', label: ['Pengembang', 'Developer'] },
]
