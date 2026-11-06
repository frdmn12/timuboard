import SegmentedFilter from '@/components/common/SegmentedFilter'
import { useThemeMode, type ThemeMode } from '@/hooks/useTheme'
import { useI18n } from '@/hooks/useI18n'

export default function ThemeChoice() {
  const [mode, setMode] = useThemeMode()
  const { t } = useI18n()
  const options: [ThemeMode, string][] = [['light', t('Terang', 'Light')], ['dark', t('Gelap', 'Dark')], ['system', t('Ikuti sistem', 'System')]]
  return <SegmentedFilter label={t('Tema', 'Theme')} value={mode} options={options} onChange={setMode} />
}
