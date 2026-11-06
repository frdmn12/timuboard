import { useLocation, useNavigate } from 'react-router'
import SegmentedFilter from '@/components/common/SegmentedFilter'
import { useI18n } from '@/hooks/useI18n'
import { localizePath, savePref, stripLang, type Lang } from '@/lib/i18n'

const options: [Lang, string][] = [['id', 'Bahasa Indonesia'], ['en', 'English']]

/** Pilihan bahasa di Pengaturan; sama dengan LangSwitch, tapi dua opsi tertulis lengkap. */
export default function LanguageChoice() {
  const { lang, t } = useI18n()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const change = (l: Lang) => { savePref(l); navigate(localizePath(stripLang(pathname), l) + search) }
  return <SegmentedFilter label={t('Bahasa', 'Language')} value={lang} options={options} onChange={change} />
}
