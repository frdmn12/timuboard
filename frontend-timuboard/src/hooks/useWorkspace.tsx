import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { errorMessage } from '@/lib/errors'
import { nextStatus, statuses, type Status, type Task } from '@/data/dashboard'
import type { Member } from '@/data/team'
import { toTask, type ApiTask, type Board } from '@/data/workspace'
import { tt } from '@/lib/i18n'

const KEY = 'timuboard-board'
const stored = () => { try { return localStorage.getItem(KEY) } catch { return null } }
const progressFor = (s: Status) => statuses.find((x) => x.id === s)!.pct

type Load = 'loading' | 'ready' | 'error'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RealtimePayload = Record<string, any>

function useWorkspaceState() {
  const [boards, setBoards] = useState<Board[]>([])
  const [load, setLoad] = useState<Load>('loading')
  const [boardId, setBoardId] = useState<string | null>(stored)
  const [tasks, setTasksState] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [pinned, setPinned] = useState<Task[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const tasksRef = useRef<Task[]>([])
  const draggingRef = useRef(false)
  const pendingRef = useRef<[string, RealtimePayload][]>([])
  const { user } = useAuth()

  const setTasks = useCallback((next: Task[]) => { tasksRef.current = next; setTasksState(next) }, [])
  const fail = (err: unknown) => setNotice(errorMessage(err))

  const activeId = boards.find((b) => b.id === boardId)?.id ?? boards[0]?.id ?? null
  const board = boards.find((b) => b.id === activeId) ?? null

  const refreshBoards = useCallback(async () => {
    const list = await api<Board[]>('/boards')
    setBoards(list)
    return list
  }, [])

  const loadBoardData = useCallback(async (id: string) => {
    const [t, m] = await Promise.all([api<ApiTask[]>(`/boards/${id}/tasks`), api<Member[]>(`/boards/${id}/members`)])
    setTasks(t.map(toTask))
    setMembers(m)
  }, [setTasks])

  const refreshPinned = useCallback(async () => {
    setPinned((await api<ApiTask[]>('/tasks/pinned')).map(toTask))
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([refreshBoards(), refreshPinned()])
      .then(() => active && setLoad('ready'))
      .catch((err) => { if (active) { setLoad('error'); fail(err) } })
    return () => { active = false }
  }, [refreshBoards, refreshPinned])

  useEffect(() => {
    if (!activeId) { setTasks([]); setMembers([]); return }
    let active = true
    loadBoardData(activeId).catch((err) => active && fail(err))
    return () => { active = false }
  }, [activeId, loadBoardData, setTasks])

  const reload = () => (activeId ? loadBoardData(activeId) : Promise.resolve())

  /** Sinkron ulang semua data (dipakai setelah koneksi realtime tersambung kembali, untuk menutup event yang terlewat). */
  const resync = async () => {
    try { await Promise.all([refreshBoards(), refreshPinned(), reload()]) } catch (err) { fail(err) }
  }

  const patchTask = (id: string, fn: (t: Task) => Task) => {
    setTasks(tasksRef.current.map((t) => (t.id === id ? fn(t) : t)))
    setPinned((p) => p.map((t) => (t.id === id ? fn(t) : t)))
  }

  /** Terapkan satu event siaran dari anggota lain ke state lokal. */
  const runRealtime = (event: string, p: RealtimePayload) => {
    const here = p.boardId === activeId
    switch (event) {
      case 'task:created': {
        if (!here || tasksRef.current.some((t) => t.id === p.task.id)) return
        const t = toTask({ ...p.task, pinned: false } as ApiTask)
        setTasks(statuses.flatMap((s) => {
          const col = tasksRef.current.filter((x) => x.status === s.id)
          if (s.id === t.status) col.splice(Math.min(p.task.order ?? col.length, col.length), 0, t)
          return col
        }))
        void refreshBoards(); return
      }
      case 'task:updated':
        if (here) patchTask(p.task.id, (old) => toTask({ ...p.task, pinned: old.pinned } as ApiTask))
        return
      case 'task:moved': {
        if (!here) return
        const cols = (p.columns ?? {}) as Record<string, string[]>
        const merged = new Map(tasksRef.current.map((t) => [t.id, t]))
        const old = merged.get(p.task.id)
        if (old) merged.set(old.id, toTask({ ...p.task, pinned: old.pinned } as ApiTask))
        else merged.set(p.task.id, toTask({ ...p.task, pinned: false } as ApiTask))
        setTasks(statuses.flatMap((s) => {
          const ordered = (cols[s.id] ?? []).map((id) => merged.get(id)).filter((t): t is Task => !!t && t.status === s.id)
          const rest = [...merged.values()].filter((t) => t.status === s.id && !ordered.some((o) => o.id === t.id))
          return [...ordered, ...rest]
        }))
        patchTask(p.task.id, (t) => ({ ...t, status: p.task.status, pct: p.task.progress }))
        void refreshBoards(); return
      }
      case 'task:deleted':
        setTasks(tasksRef.current.filter((t) => t.id !== p.taskId))
        setPinned((cur) => cur.filter((t) => t.id !== p.taskId))
        void refreshBoards(); return
      case 'comment:created': case 'comment:updated': case 'comment:deleted':
        patchTask(p.taskId, (t) => ({ ...t, commentCount: p.commentCount }))
        return
      case 'member:added': case 'member:updated': case 'member:removed':
        if (event === 'member:removed' && p.userId === user?.id) {
          setNotice(tt('Anda dikeluarkan dari proyek ini.', 'You were removed from this project.'))
          void refreshBoards().catch(() => undefined)
          return
        }
        if (here && activeId) void api<Member[]>(`/boards/${activeId}/members`).then(setMembers).catch(() => undefined)
        void refreshBoards().catch(() => undefined)
        return
      case 'board:updated':
        setBoards((cur) => cur.map((b) => (b.id === p.board.id ? { ...b, name: p.board.name, description: p.board.description, updatedAt: p.board.updatedAt } : b)))
        return
      case 'board:deleted':
        if (here) setNotice(tt('Proyek ini telah dihapus.', 'This project was deleted.'))
        void refreshBoards().catch(() => undefined)
    }
  }

  /** Selama pengguna menyeret kartu, event tertahan agar kartu tidak melompat; diterapkan saat dilepas. */
  const applyRealtime = (event: string, p: RealtimePayload) => {
    if (draggingRef.current) pendingRef.current.push([event, p])
    else runRealtime(event, p)
  }
  const setDragging = (on: boolean) => {
    draggingRef.current = on
    if (!on) { const queued = pendingRef.current; pendingRef.current = []; queued.forEach(([e, p]) => runRealtime(e, p)) }
  }
  const replace = (t: Task) => {
    setTasks(tasksRef.current.map((x) => (x.id === t.id ? t : x)))
    setPinned((p) => (t.pinned ? (p.some((x) => x.id === t.id) ? p.map((x) => (x.id === t.id ? t : x)) : [t, ...p]) : p.filter((x) => x.id !== t.id)))
  }

  /** Kirim posisi akhir tugas ke server; pada gagal, tarik ulang data agar UI tidak berbohong. */
  const commitMove = async (id: string) => {
    const list = tasksRef.current
    const task = list.find((t) => t.id === id)
    if (!task || !activeId) return
    const position = list.filter((t) => t.status === task.status).findIndex((t) => t.id === id)
    try {
      replace(toTask(await api<ApiTask>(`/boards/${activeId}/tasks/${id}/move`, 'POST', { status: task.status, position })))
      void refreshBoards()
    } catch (err) {
      fail(err); await reload().catch(() => undefined)
    }
  }

  return {
    applyRealtime, setDragging, resync,
    boards, board, boardId: activeId, load, tasks, members, pinned, notice, dismissNotice: () => setNotice(null),
    selectBoard: (id: string) => { setBoardId(id); try { localStorage.setItem(KEY, id) } catch { /* abaikan */ } },
    refreshBoards,

    createBoard: async (name: string, description: string) => {
      const created = await api<Board>('/boards', 'POST', { name, ...(description && { description }) })
      await refreshBoards()
      setBoardId(created.id)
      try { localStorage.setItem(KEY, created.id) } catch { /* abaikan */ }
      return created
    },

    addTask: async (title: string, status: Status, date?: Date | null) => {
      if (!activeId) return
      try {
        const t = toTask(await api<ApiTask>(`/boards/${activeId}/tasks`, 'POST', { title, status, ...(date && { dueDate: date.toISOString() }) }))
        setTasks([...tasksRef.current, t])
        void refreshBoards()
      } catch (err) { fail(err) }
    },

    /** Geser kolom saat drag: hanya lokal; server diberi tahu lewat commitMove saat dilepas. */
    reorder: (groups: Record<string, (string | number)[]>) => {
      const byId = new Map(tasksRef.current.map((t) => [t.id, t]))
      const shown = new Set(Object.values(groups).flat().map(String))
      setTasks(statuses.flatMap((s) => [
        ...(groups[s.id] ?? []).map((id) => ({ ...byId.get(String(id))!, status: s.id })),
        ...tasksRef.current.filter((t) => t.status === s.id && !shown.has(t.id)),
      ]))
    },
    commitMove,
    restore: (snapshot: Task[]) => setTasks(snapshot),

    /** Pindah ke status berikutnya (tombol panah), di akhir kolom tujuan. */
    advance: async (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id)
      const next = task && nextStatus(task.status)
      if (!task || !next || !activeId) return
      const rest = tasksRef.current.filter((t) => t.id !== id)
      setTasks(statuses.flatMap((s) => [...rest.filter((t) => t.status === s.id), ...(s.id === next ? [{ ...task, status: next, pct: Math.max(task.pct, progressFor(next)) }] : [])]))
      await commitMove(id)
    },

    togglePin: async (task: Task) => {
      const on = !task.pinned
      replace({ ...task, pinned: on })
      try {
        await api(`/boards/${task.boardId}/tasks/${task.id}/pin`, on ? 'PUT' : 'DELETE')
      } catch (err) {
        fail(err); replace(task)
      }
    },

    assign: async (task: Task, assigneeId: string | null) => {
      try { replace(toTask(await api<ApiTask>(`/boards/${task.boardId}/tasks/${task.id}`, 'PATCH', { assigneeId }))) } catch (err) { fail(err) }
    },

    /** Sinkronkan jumlah komentar di kartu setelah komentar dibuat atau dihapus. */
    bumpCommentCount: (taskId: string, delta: number) => {
      const bump = (t: Task) => (t.id === taskId ? { ...t, commentCount: Math.max(0, t.commentCount + delta) } : t)
      setTasks(tasksRef.current.map(bump))
      setPinned((p) => p.map(bump))
    },

    /** Simpan perubahan tugas; melempar galat agar form bisa menampilkannya. */
    updateTask: async (task: Task, patch: { title: string; description: string; tags: string[]; dueDate: Date | null; assigneeId: string | null; progress: number }) => {
      const updated = toTask(await api<ApiTask>(`/boards/${task.boardId}/tasks/${task.id}`, 'PATCH', {
        title: patch.title,
        description: patch.description || null,
        tags: patch.tags,
        dueDate: patch.dueDate ? patch.dueDate.toISOString() : null,
        assigneeId: patch.assigneeId,
        progress: patch.progress,
      }))
      replace(updated)
      void refreshBoards()
    },

    removeTask: async (task: Task) => {
      await api(`/boards/${task.boardId}/tasks/${task.id}`, 'DELETE')
      setTasks(tasksRef.current.filter((t) => t.id !== task.id))
      setPinned((p) => p.filter((t) => t.id !== task.id))
      void refreshBoards()
    },

    addMember: async (email: string, role: Member['role']) => {
      if (!activeId) return
      await api(`/boards/${activeId}/members`, 'POST', { email, role })
      setMembers(await api<Member[]>(`/boards/${activeId}/members`))
      void refreshBoards()
    },
  }
}

const Ctx = createContext<ReturnType<typeof useWorkspaceState> | null>(null)

/** Data kerja milik pengguna yang masuk: papan, tugas papan aktif, anggota, dan tugas tersemat. */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useWorkspaceState()}>{children}</Ctx.Provider>
}

export function useWorkspace() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useWorkspace harus dipakai di dalam WorkspaceProvider')
  return v
}
