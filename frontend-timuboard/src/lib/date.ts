import { locale, tt } from './i18n'

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (n: number, from = new Date()) => { const d = startOfDay(from); d.setDate(d.getDate() + n); return d }
export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const relative = () => new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' })
const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase(locale()) + s.slice(1)

/** Tenggat dalam bahasa sehari-hari: Hari ini/Today, Besok/Tomorrow, Kemarin/Yesterday, atau nama hari/tanggal. */
export function formatDue(d: Date) {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86_400_000)
  if (Math.abs(diff) <= 1) return capitalize(relative().format(diff, 'day'))
  const opts: Intl.DateTimeFormatOptions = Math.abs(diff) < 7 ? { weekday: 'long' } : { day: 'numeric', month: 'short' }
  return new Intl.DateTimeFormat(locale(), opts).format(d)
}

/** Waktu relatif singkat untuk komentar: "baru saja", "5 menit yang lalu", "kemarin", atau tanggal (mengikuti bahasa aktif). */
export function formatRelative(iso: string) {
  const d = new Date(iso)
  const sec = Math.round((Date.now() - d.getTime()) / 1000)
  if (sec < 45) return tt('baru saja', 'just now')
  if (sec < 3600) return relative().format(-Math.round(sec / 60), 'minute')
  if (sec < 86_400) return relative().format(-Math.round(sec / 3600), 'hour')
  const days = Math.round((startOfDay(new Date()).getTime() - startOfDay(d).getTime()) / 86_400_000)
  if (days < 7) return relative().format(-days, 'day')
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }).format(d)
}
