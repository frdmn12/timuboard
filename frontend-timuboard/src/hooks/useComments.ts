import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { socket } from '@/lib/socket'
import { useAuth } from '@/hooks/useAuth'
import type { Task } from '@/data/dashboard'
import type { CommentPage, TaskComment } from '@/data/workspace'
import { useWorkspace } from '@/hooks/useWorkspace'

const PAGE = 20

/** Komentar satu tugas: muat terbaru, muat yang lebih lama, kirim, edit, hapus. Galat dilempar ke pemanggil. */
export function useComments(task: Pick<Task, 'id' | 'boardId'>) {
  const { bumpCommentCount, board } = useWorkspace()
  const { user } = useAuth()
  const base = `/boards/${task.boardId}/tasks/${task.id}/comments`
  const [items, setItems] = useState<TaskComment[]>([])
  const [nextBefore, setNextBefore] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  const load = useCallback(async () => {
    setState('loading')
    try {
      const page = await api<CommentPage>(`${base}?limit=${PAGE}`)
      setItems(page.items); setNextBefore(page.nextBefore); setState('ready')
    } catch {
      setState('error')
    }
  }, [base])

  useEffect(() => { void load() }, [load])

  // Komentar dari orang lain masuk langsung. Hak edit/hapus dihitung di sini (siaran tidak memuatnya).
  useEffect(() => {
    const withRights = (c: Omit<TaskComment, 'canEdit' | 'canDelete'>): TaskComment => {
      const mine = c.author?.id === user?.id
      return { ...c, canEdit: mine, canDelete: mine || board?.role === 'admin' }
    }
    const created = (p: { taskId: string; comment: TaskComment }) => {
      if (p.taskId === task.id) setItems((cur) => (cur.some((x) => x.id === p.comment.id) ? cur : [...cur, withRights(p.comment)]))
    }
    const updated = (p: { taskId: string; comment: TaskComment }) => {
      if (p.taskId === task.id) setItems((cur) => cur.map((x) => (x.id === p.comment.id ? withRights(p.comment) : x)))
    }
    const deleted = (p: { taskId: string; commentId: string }) => {
      if (p.taskId === task.id) setItems((cur) => cur.filter((x) => x.id !== p.commentId))
    }
    socket.on('comment:created', created); socket.on('comment:updated', updated); socket.on('comment:deleted', deleted)
    return () => { socket.off('comment:created', created); socket.off('comment:updated', updated); socket.off('comment:deleted', deleted) }
  }, [task.id, user?.id, board?.role])

  return {
    items, state, hasMore: nextBefore !== null, reload: load,

    loadOlder: async () => {
      if (!nextBefore) return
      const page = await api<CommentPage>(`${base}?limit=${PAGE}&before=${encodeURIComponent(nextBefore)}`)
      setItems((cur) => [...page.items, ...cur]); setNextBefore(page.nextBefore)
    },

    add: async (body: string) => {
      const c = await api<TaskComment>(base, 'POST', { body })
      setItems((cur) => [...cur, c]); bumpCommentCount(task.id, 1)
    },

    edit: async (id: string, body: string) => {
      const c = await api<TaskComment>(`${base}/${id}`, 'PATCH', { body })
      setItems((cur) => cur.map((x) => (x.id === id ? c : x)))
    },

    remove: async (id: string) => {
      await api(`${base}/${id}`, 'DELETE')
      setItems((cur) => cur.filter((x) => x.id !== id)); bumpCommentCount(task.id, -1)
    },
  }
}
