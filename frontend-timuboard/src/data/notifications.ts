import { tt } from '@/lib/i18n'

export type NotificationType = 'task_assigned' | 'comment_added' | 'review_requested' | 'board_added'

export type AppNotification = {
  id: string
  type: NotificationType
  actor: { id: string; name: string } | null
  boardId: string | null
  taskId: string | null
  data: { taskTitle?: string; boardName?: string; preview?: string }
  read: boolean
  createdAt: string
}

export type NotificationPage = { items: AppNotification[]; nextBefore: string | null; unreadCount: number }

export type NotificationPrefs = { assigned: boolean; comment: boolean; review: boolean; boardAdded: boolean }

/** Kalimat notifikasi tanpa nama aktor (aktor ditebalkan terpisah). */
export function notificationText(n: AppNotification): string {
  const task = `"${n.data.taskTitle ?? tt('tugas', 'a task')}"`
  switch (n.type) {
    case 'task_assigned': return tt(`menugaskan Anda pada ${task}`, `assigned you to ${task}`)
    case 'comment_added': return tt(`berkomentar di ${task}`, `commented on ${task}`)
    case 'review_requested': return tt(`memindahkan ${task} ke Review`, `moved ${task} to Review`)
    case 'board_added': return tt(`menambahkan Anda ke proyek "${n.data.boardName ?? 'baru'}"`, `added you to the project "${n.data.boardName ?? 'new'}"`)
  }
}
