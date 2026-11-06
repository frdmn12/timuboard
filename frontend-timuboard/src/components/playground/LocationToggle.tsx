import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { deviceTz, tzLabel } from '@/data/playground'
import { useI18n } from '@/hooks/useI18n'

type Props = { sharing: boolean; disabled: boolean; onChange: (on: boolean) => Promise<boolean> }

/** Opt-in: perkiraan lokasi dari zona waktu perangkat, tampil di daftar online ruang ini. */
export default function LocationToggle({ sharing, disabled, onChange }: Props) {
  const [error, setError] = useState('')
  const { t } = useI18n()
  const tz = deviceTz()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="share-location">{t('Tampilkan lokasiku', 'Show my location')}</Label>
        <Switch id="share-location" checked={sharing} disabled={disabled || !tz} aria-describedby="share-location-hint"
          onCheckedChange={async (on) => setError((await onChange(on)) ? '' : t('Belum tersimpan. Coba lagi sebentar.', 'Not saved yet. Try again in a moment.'))} />
      </div>
      <p id="share-location-hint" className="text-sm">
        {tz ? t(`Perkiraan dari zona waktu perangkatmu (${tzLabel(tz)}), bukan GPS. Tidak disimpan di server.`, `Estimated from your device’s time zone (${tzLabel(tz)}), not GPS. Not stored on the server.`) : t('Zona waktu perangkatmu tidak terbaca.', 'Couldn’t read your device’s time zone.')}
      </p>
      {error && <p role="alert" className="text-sm">{error}</p>}
    </div>
  )
}
