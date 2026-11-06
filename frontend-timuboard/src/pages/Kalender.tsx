import { useState } from 'react'
import { useWorkspace } from '@/hooks/useWorkspace'
import { sameDay, startOfDay } from '@/lib/date'
import Topbar from '@/components/dashboard/Topbar'
import TaskCalendar from '@/components/calendar/TaskCalendar'
import DayAgenda from '@/components/calendar/DayAgenda'
import BoardSwitcher from '@/components/layout/BoardSwitcher'
import RequireBoard from '@/components/layout/RequireBoard'
import { useI18n } from '@/hooks/useI18n'

export default function Kalender() {
  const { tasks, addTask } = useWorkspace()
  const { t } = useI18n()
  const [selected, setSelected] = useState(() => startOfDay(new Date()))
  const scheduled = tasks.filter((t): t is typeof t & { date: Date } => t.date !== null)
  const dayTasks = scheduled.filter((t) => sameDay(t.date, selected))
  return (
    <div className="flex flex-col gap-6">
      <Topbar title={t('Kalender', 'Calendar')} />
      <RequireBoard>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">{t(`${scheduled.length} tugas berjadwal`, `${scheduled.length} scheduled tasks`)}</p>
          <h1 className="text-[clamp(32px,4.5vw,48px)] leading-none font-semibold tracking-[-0.03em]">{t('Kalender', 'Calendar')}</h1>
          <div className="flex flex-wrap items-center gap-3 text-lg text-muted-foreground"><BoardSwitcher /><span>{t('Titik biru menandai hari yang punya tenggat.', 'Blue dots mark days with something due.')}</span></div>
        </div>
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start gap-4 max-[1100px]:grid-cols-1">
          <TaskCalendar selected={selected} onSelect={setSelected} taskDates={scheduled.map((t) => t.date)} />
          <DayAgenda date={selected} tasks={dayTasks} onAdd={(title) => addTask(title, 'todo', selected)} />
        </div>
      </RequireBoard>
    </div>
  )
}
