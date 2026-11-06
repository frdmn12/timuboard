import { useI18n } from '@/hooks/useI18n'
import { integrations } from '@/data/landing'
import BrandIcon from '@/components/common/BrandIcon'

export default function IntegrationsRow() {
  const { t } = useI18n()
  return (
    <section className="flex flex-col items-center gap-6 pt-20 pb-10 text-center">
      <h2 data-m="reveal" className="text-2xl leading-[0.9] font-semibold tracking-[-0.01em]">{t('Terhubung dengan alat yang sudah tim Anda pakai', 'Works with the tools your team already uses')}</h2>
      <ul data-m="logos" className="m-0 flex list-none flex-wrap justify-center gap-x-10 gap-y-6 p-0 text-primary">
        {integrations.map((i) => (
          <li key={i.name} data-m="logo" className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
            <BrandIcon path={i.path} />{i.name}
          </li>
        ))}
      </ul>
    </section>
  )
}
