import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import type { NotificationPrefs } from '@/data/notifications'
import type { Txt } from '@/lib/i18n'

export const notificationItems: { id: keyof NotificationPrefs; label: Txt; hint: Txt }[] = [
  { id: 'assigned', label: ['Tugas ditugaskan ke saya', 'Tasks assigned to me'], hint: ['Notifikasi saat seseorang menugaskan tugas kepada Anda.', 'When someone assigns a task to you.'] },
  { id: 'review', label: ['Permintaan review', 'Review requests'], hint: ['Notifikasi saat tugas dipindahkan ke Review.', 'When a task is moved to Review.'] },
  { id: 'comment', label: ['Komentar baru', 'New comments'], hint: ['Notifikasi saat ada komentar di tugas Anda.', 'When someone comments on your task.'] },
  { id: 'boardAdded', label: ['Ditambahkan ke proyek', 'Added to a project'], hint: ['Notifikasi saat Anda ditambahkan ke sebuah proyek.', 'When you’re added to a project.'] },
]

/** Preferensi notifikasi dari server; perubahan optimistis dengan rollback bila gagal. */
export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    setFailed(false)
    api<NotificationPrefs>('/notifications/preferences').then(setPrefs).catch(() => setFailed(true))
  }, [])
  useEffect(load, [load])

  const set = async (id: keyof NotificationPrefs, on: boolean) => {
    setError(null)
    setPrefs((p) => p && { ...p, [id]: on })
    try { setPrefs(await api<NotificationPrefs>('/notifications/preferences', 'PATCH', { [id]: on })) } catch (err) {
      setPrefs((p) => p && { ...p, [id]: !on })
      setError(errorMessage(err))
    }
  }
  return { prefs, error, failed, retry: load, set }
}
