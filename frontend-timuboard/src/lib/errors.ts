import { ApiError } from './api'
import { tt, type Txt } from './i18n'

const messages: Record<string, Txt> = {
  EMAIL_ALREADY_REGISTERED: ['Email ini sudah terdaftar. Coba masuk, atau pakai email lain.', 'This email is already registered. Try signing in, or use another email.'],
  INVALID_CREDENTIALS: ['Email atau kata sandi salah.', 'Incorrect email or password.'],
  EMAIL_NOT_VERIFIED: ['Email Anda belum diverifikasi. Cek kotak masuk Anda.', 'Your email isn’t verified yet. Check your inbox.'],
  INVALID_OR_EXPIRED_TOKEN: ['Tautan verifikasi tidak valid atau sudah kedaluwarsa.', 'The verification link is invalid or has expired.'],
  USER_NOT_FOUND: ['Belum ada akun dengan email itu. Minta mereka mendaftar dulu.', 'No account uses that email yet. Ask them to sign up first.'],
  ALREADY_MEMBER: ['Orang ini sudah menjadi anggota papan.', 'This person is already a member of the board.'],
  INSUFFICIENT_BOARD_ROLE: ['Anda tidak punya izin untuk melakukan ini.', 'You don’t have permission to do this.'],
  ASSIGNEE_NOT_MEMBER: ['Penanggung jawab harus anggota papan.', 'The assignee must be a board member.'],
  BOARD_NOT_FOUND: ['Proyek tidak ditemukan.', 'Project not found.'],
  TASK_NOT_FOUND: ['Tugas tidak ditemukan.', 'Task not found.'],
  NOT_COMMENT_AUTHOR: ['Hanya penulis yang bisa mengedit komentar.', 'Only the author can edit this comment.'],
  COMMENT_NOT_FOUND: ['Komentar tidak ditemukan.', 'Comment not found.'],
  INVALID_GOOGLE_TOKEN: ['Masuk dengan Google gagal. Coba lagi.', 'Google sign-in failed. Try again.'],
  GOOGLE_EMAIL_NOT_VERIFIED: ['Email akun Google Anda belum terverifikasi.', 'Your Google account’s email isn’t verified.'],
  TOO_MANY_REQUESTS: ['Terlalu banyak percobaan. Tunggu semenit lalu coba lagi.', 'Too many attempts. Wait a minute and try again.'],
  NETWORK_ERROR: ['Tidak dapat terhubung ke server. Pastikan backend berjalan.', 'Can’t reach the server. Make sure the backend is running.'],
}
const FALLBACK: Txt = ['Terjadi kesalahan. Coba lagi sebentar lagi.', 'Something went wrong. Try again in a moment.']

/** Pesan ramah untuk kesalahan API, dalam bahasa aktif. */
export function errorMessage(err: unknown): string {
  return tt(...((err instanceof ApiError && messages[err.code]) || FALLBACK))
}

export const errorCode = (err: unknown) => (err instanceof ApiError ? err.code : null)
