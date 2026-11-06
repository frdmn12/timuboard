import { enUS, id } from 'react-day-picker/locale'
import { Calendar } from '@/components/ui/calendar'
import { useI18n } from '@/hooks/useI18n'

type Props = { selected: Date; onSelect: (d: Date) => void; taskDates: Date[] }

/** Kalender bulan (shadcn Calendar); titik biru menandai hari yang punya tenggat. */
export default function TaskCalendar({ selected, onSelect, taskDates }: Props) {
  const { lang } = useI18n()
  return (
    <div className="rounded-card bg-card p-6">
      <Calendar
        mode="single" locale={lang === 'en' ? enUS : id} weekStartsOn={1} required
        selected={selected} onSelect={(d) => d && onSelect(d)} defaultMonth={selected}
        modifiers={{ hasTask: taskDates }}
        className="bg-transparent"
      />
    </div>
  )
}
