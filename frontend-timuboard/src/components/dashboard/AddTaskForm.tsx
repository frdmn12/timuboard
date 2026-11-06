import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/hooks/useI18n'

type Props = { onAdd: (title: string) => void; onClose: () => void }

export default function AddTaskForm({ onAdd, onClose }: Props) {
  const { t } = useI18n()
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const title = String(new FormData(e.currentTarget).get('title') ?? '').trim()
    if (title) { onAdd(title); onClose() }
  }
  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input name="title" autoFocus placeholder={t('Judul tugas', 'Task title')} aria-label={t('Judul tugas', 'Task title')} onKeyDown={(e) => e.key === 'Escape' && onClose()} className="h-10 bg-background" />
      <Button type="submit">{t('Tambah', 'Add')}</Button>
    </form>
  )
}
