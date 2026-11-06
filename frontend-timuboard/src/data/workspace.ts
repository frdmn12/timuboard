import type { Status, Task } from './dashboard'

/** Papan (di UI disebut Proyek), bentuk respons API. */
export type Board = {
  id: string
  name: string
  description: string | null
  ownerId: string
  role: 'admin' | 'member'
  memberCount: number
  taskCount: number
  doneCount: number
  progress: number
  createdAt: string
  updatedAt: string
}

export type ApiTask = {
  id: string
  boardId: string
  title: string
  description: string | null
  status: Status
  progress: number
  tags: string[]
  dueDate: string | null
  assignee: { id: string; name: string } | null
  pinned: boolean
  commentCount: number
}

export type TaskComment = {
  id: string
  taskId: string
  body: string
  author: { id: string; name: string } | null
  createdAt: string
  edited: boolean
  canEdit: boolean
  canDelete: boolean
}

export type CommentPage = { items: TaskComment[]; nextBefore: string | null }

export const toTask = (t: ApiTask): Task => ({
  id: t.id,
  boardId: t.boardId,
  title: t.title,
  desc: t.description ?? '',
  tags: t.tags,
  status: t.status,
  pct: t.progress,
  who: t.assignee?.name ?? '',
  assigneeId: t.assignee?.id ?? null,
  date: t.dueDate ? new Date(t.dueDate) : null,
  pinned: t.pinned,
  commentCount: t.commentCount,
})
