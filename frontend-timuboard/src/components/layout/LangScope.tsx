import { Navigate, Outlet, useLocation, useParams } from 'react-router'
import { I18nProvider } from '@/hooks/useI18n'
import { browserLang, localizePath, readPref } from '@/lib/i18n'
import NotFound from '@/pages/NotFound'

/**
 * Induk semua rute (`/:lang?`). URL menentukan bahasa: /en/... = Inggris, tanpa prefix = Indonesia.
 * Kunjungan tanpa prefix diarahkan ke /en bila pilihan tersimpan (atau bahasa browser) adalah Inggris.
 */
export default function LangScope() {
  const { lang: param } = useParams()
  const { pathname, search, hash } = useLocation()
  if (param !== undefined && param !== 'en') return <I18nProvider lang="id"><NotFound /></I18nProvider>
  if (param === undefined && (readPref() ?? browserLang()) === 'en') return <Navigate replace to={localizePath(pathname, 'en') + search + hash} />
  return <I18nProvider lang={param === 'en' ? 'en' : 'id'}><Outlet /></I18nProvider>
}
