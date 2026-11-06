import Logo from '@/components/common/Logo'
import { useI18n } from '@/hooks/useI18n'

const groups = [
  [['Produk', 'Product'], [['Papan', 'Boards'], ['Linimasa', 'Timeline'], ['Integrasi', 'Integrations']], '/#fitur'],
  [['Perusahaan', 'Company'], [['Tentang', 'About'], ['Karier', 'Careers'], ['Blog', 'Blog']], '/#cerita'],
  [['Bantuan', 'Help'], [['Panduan', 'Guides'], ['Kontak', 'Contact'], ['Privasi', 'Privacy']], '/#mulai'],
] as const
// Href absolut (/#...) agar tetap mengarah ke bagian landing saat footer dipakai di laman lain.

export default function SiteFooter() {
  const { t, tx, path } = useI18n()
  return (
    <footer className="mx-auto grid max-w-[1200px] grid-cols-[2fr_repeat(3,1fr)] gap-8 pt-20 pb-12 max-[760px]:grid-cols-2">
      <div><Logo /><p className="mt-2 text-base text-muted-foreground">{t('Kerja tim dalam cahaya awan.', 'Teamwork in the light of the clouds.')}</p></div>
      {groups.map(([title, items, href]) => (
        <div key={title[0]}>
          <h4 className="mb-4 text-base font-semibold">{tx(title)}</h4>
          {items.map((i) => <a key={i[0]} href={path(href)} className="mb-4 block font-medium">{tx(i)}</a>)}
        </div>
      ))}
      <small className="col-span-full text-xs text-muted-foreground">© 2026 Timuboard</small>
    </footer>
  )
}
