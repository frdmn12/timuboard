import LogoutButton from '@/components/common/LogoutButton'
import Topbar from '@/components/dashboard/Topbar'
import SettingsSection from '@/components/settings/SettingsSection'
import ProfileForm from '@/components/settings/ProfileForm'
import LanguageChoice from '@/components/settings/LanguageChoice'
import ThemeChoice from '@/components/settings/ThemeChoice'
import NotificationList from '@/components/settings/NotificationList'
import PasswordForm from '@/components/settings/PasswordForm'
import { useI18n } from '@/hooks/useI18n'

export default function Pengaturan() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-6">
      <Topbar title={t('Pengaturan', 'Settings')} />
      <div className="flex flex-col gap-2">
        <h1 className="text-[clamp(32px,4.5vw,48px)] leading-none font-semibold tracking-[-0.03em]">{t('Pengaturan', 'Settings')}</h1>
        <p className="text-lg text-muted-foreground">{t('Atur profil, tampilan, dan pemberitahuan Anda.', 'Manage your profile, appearance, and notifications.')}</p>
      </div>
      <SettingsSection title={t('Profil', 'Profile')} desc={t('Nama dan email yang dilihat anggota tim lain.', 'The name and email other team members see.')}><ProfileForm /></SettingsSection>
      <SettingsSection title={t('Tampilan', 'Appearance')} desc={t('Pilih tema terang, gelap, atau ikuti pengaturan perangkat.', 'Choose light, dark, or follow your device.')}><ThemeChoice /></SettingsSection>
      <SettingsSection title={t('Bahasa', 'Language')} desc={t('Bahasa untuk seluruh aplikasi di perangkat ini.', 'The language for the whole app on this device.')}><LanguageChoice /></SettingsSection>
      <SettingsSection title={t('Notifikasi', 'Notifications')} desc={t('Pilih kabar yang muncul di lonceng notifikasi dalam aplikasi. Belum ada pengiriman email.', 'Choose what shows up in the in-app notification bell. Email delivery isn’t available yet.')}><NotificationList /></SettingsSection>
      <SettingsSection title={t('Keamanan', 'Security')} desc={t('Gunakan kata sandi yang kuat dan unik.', 'Use a strong, unique password.')}><PasswordForm /></SettingsSection>
      <SettingsSection title={t('Akun', 'Account')} desc={t('Keluar dari Timuboard di perangkat ini.', 'Sign out of Timuboard on this device.')}>
        <LogoutButton variant="secondary" className="self-start bg-background" />
      </SettingsSection>
    </div>
  )
}
