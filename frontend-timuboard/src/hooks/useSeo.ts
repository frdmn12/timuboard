import { useEffect } from 'react'
import { localizePath, type Lang } from '@/lib/i18n'
import { useI18n } from '@/hooks/useI18n'

export const SITE_URL = 'https://timuboard.timulabs.dev'
/** Versi Indonesia sama dengan nilai statis di index.html (dibaca crawler yang tidak menjalankan JS). */
const DEFAULTS: Record<Lang, { title: string; description: string }> = {
  id: { title: 'Timuboard: papan kerja tim real-time', description: 'Atur tugas, pantau progres, dan lihat siapa mengerjakan apa dalam satu papan bersama. Perubahan tampil langsung untuk seluruh tim.' },
  en: { title: 'Timuboard: real-time team board', description: 'Organize tasks, track progress, and see who’s doing what on one shared board. Changes show up instantly for the whole team.' },
}

type Seo = {
  /** Judul laman tanpa nama merek; kosong = judul bawaan beranda. */
  title?: string
  description?: string
  /** Path kanonis tanpa prefix bahasa (mis. "/playground"). Kosong = tanpa canonical/hreflang (laman privat/noindex). */
  path?: string
  /** Laman yang tidak perlu muncul di hasil pencarian (alur akun, aplikasi, 404). */
  noindex?: boolean
}

/** Ubah atau buat tag di <head> yang cocok dengan `match`; value null = hapus tag. */
function setTag(tag: 'meta' | 'link', match: Record<string, string>, attr: string, value: string | null) {
  const selector = tag + Object.entries(match).map(([k, v]) => `[${k}="${v}"]`).join('')
  let el = document.head.querySelector(selector)
  if (value === null) return el?.remove()
  if (!el) {
    el = document.createElement(tag)
    for (const [k, v] of Object.entries(match)) el.setAttribute(k, v)
    document.head.append(el)
  }
  el.setAttribute(attr, value)
}

/**
 * Judul, deskripsi, canonical, hreflang, dan robots per laman dan per bahasa (SPA: index.html hanya punya nilai beranda Indonesia).
 * Google menjalankan JS sehingga membaca nilai ini; pratinjau tautan media sosial tetap memakai nilai statis.
 */
export function useSeo({ title, description, path, noindex = false }: Seo = {}) {
  const { lang } = useI18n()
  useEffect(() => {
    const fullTitle = title ? `${title} · Timuboard` : DEFAULTS[lang].title
    const desc = description ?? DEFAULTS[lang].description
    const url = (l: Lang) => (path === undefined ? null : SITE_URL + localizePath(path, l))
    document.title = fullTitle
    setTag('meta', { name: 'description' }, 'content', desc)
    setTag('meta', { name: 'robots' }, 'content', noindex ? 'noindex' : null)
    setTag('meta', { property: 'og:title' }, 'content', fullTitle)
    setTag('meta', { property: 'og:description' }, 'content', desc)
    setTag('meta', { property: 'og:url' }, 'content', url(lang))
    setTag('meta', { property: 'og:locale' }, 'content', lang === 'en' ? 'en_US' : 'id_ID')
    setTag('link', { rel: 'canonical' }, 'href', url(lang))
    setTag('link', { rel: 'alternate', hreflang: 'id' }, 'href', url('id'))
    setTag('link', { rel: 'alternate', hreflang: 'en' }, 'href', url('en'))
    setTag('link', { rel: 'alternate', hreflang: 'x-default' }, 'href', url('id'))
  }, [title, description, path, noindex, lang])
}
