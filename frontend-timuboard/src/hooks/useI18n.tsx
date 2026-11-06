import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { locale, localizePath, setLang, type Lang, type Txt } from '@/lib/i18n'

const Ctx = createContext<Lang>('id')

/** Bahasa aktif untuk subtree; juga diset ke modul i18n (untuk kode non-React) dan atribut <html lang>. */
export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  setLang(lang)
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>
}

/**
 * `t('Masuk', 'Sign in')` memilih teks sesuai bahasa; `tx(pasangan)` untuk teks dari data/.
 * `path('/masuk')` menambahkan prefix /en bila perlu; `locale` untuk Intl ('id-ID' / 'en-US').
 */
export function useI18n() {
  const lang = useContext(Ctx)
  return useMemo(() => ({
    lang,
    locale: locale(lang),
    t: (id: string, en: string) => (lang === 'en' ? en : id),
    tx: (s: Txt) => s[lang === 'en' ? 1 : 0],
    path: (p: string) => localizePath(p, lang),
  }), [lang])
}
