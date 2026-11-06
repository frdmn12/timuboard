export type Lang = 'id' | 'en'
/** Teks dua bahasa untuk data di luar komponen: [Indonesia, Inggris]. */
export type Txt = readonly [id: string, en: string]

const PREF_KEY = 'lang'

/** Bahasa aktif untuk kode di luar React (pesan galat, format tanggal). Diset oleh I18nProvider saat render. */
let current: Lang = 'id'
export const getLang = () => current
export const setLang = (l: Lang) => { current = l }

/** Pilih teks sesuai bahasa aktif: tt('Masuk', 'Sign in'). */
export const tt = (id: string, en: string) => (current === 'en' ? en : id)
export const locale = (l: Lang = current) => (l === 'en' ? 'en-US' : 'id-ID')

/** "/masuk" -> "/en/masuk" untuk Inggris. Path relatif, "#…", dan URL penuh dibiarkan. */
export function localizePath(path: string, l: Lang = current) {
  if (l === 'id' || !path.startsWith('/') || path.startsWith('/en/') || path === '/en') return path
  return path === '/' ? '/en' : path.startsWith('/#') ? `/en${path.slice(1)}` : `/en${path}`
}
/** "/en/masuk" -> "/masuk". */
export const stripLang = (path: string) => {
  const rest = path.replace(/^\/en(?=\/|$|#|\?)/, '')
  return rest.startsWith('/') ? rest : `/${rest}`
}

export const readPref = (): Lang | null => {
  try { const v = localStorage.getItem(PREF_KEY); return v === 'id' || v === 'en' ? v : null } catch { return null }
}
export const savePref = (l: Lang) => { try { localStorage.setItem(PREF_KEY, l) } catch { /* mode privat: abaikan */ } }

/** Bahasa untuk kunjungan pertama tanpa pilihan tersimpan: Indonesia bila browser berbahasa Indonesia, selain itu Inggris. */
export function browserLang(): Lang {
  // Crawler (Googlebot berbahasa en-US) tidak dialihkan, agar URL Indonesia tetap terindeks apa adanya.
  if (/bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview/i.test(navigator.userAgent)) return 'id'
  return (navigator.languages?.[0] ?? navigator.language ?? 'id').toLowerCase().startsWith('id') ? 'id' : 'en'
}
