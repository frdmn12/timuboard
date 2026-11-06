import { useSeo } from '@/hooks/useSeo'
import { useI18n } from '@/hooks/useI18n'
import Landing from './Landing'

/** URL tak dikenal: tetap tampilkan beranda, tapi minta mesin pencari tidak mengindeksnya (hindari soft 404 duplikat). */
export default function NotFound() {
  const { t } = useI18n()
  useSeo({ title: t('Halaman tidak ditemukan', 'Page not found'), noindex: true })
  return <Landing />
}
