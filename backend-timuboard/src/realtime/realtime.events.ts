/** Nama room Socket.IO. */
export const boardRoom = (boardId: string) => `board:${boardId}`;
export const userRoom = (userId: string) => `user:${userId}`;

/** Event dari server ke klien. Semua payload papan membawa `{ boardId, actorId, at }`. */
export const RealtimeEvent = {
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_MOVED: 'task:moved',
  TASK_DELETED: 'task:deleted',
  COMMENT_CREATED: 'comment:created',
  COMMENT_UPDATED: 'comment:updated',
  COMMENT_DELETED: 'comment:deleted',
  MEMBER_ADDED: 'member:added',
  MEMBER_UPDATED: 'member:updated',
  MEMBER_REMOVED: 'member:removed',
  BOARD_UPDATED: 'board:updated',
  BOARD_DELETED: 'board:deleted',
  PRESENCE_UPDATE: 'presence:update',
  /** Posisi kursor anggota lain di papan (sementara, tidak disimpan). */
  CURSOR_MOVE: 'cursor:move',
  CURSOR_HIDE: 'cursor:hide',
  /** Ke room pribadi pengguna: ada notifikasi baru (klien memuat ulang hitungan). */
  NOTIFICATION_NEW: 'notification:new',
  /** Access token pada koneksi ini kedaluwarsa; klien harus refresh lalu menyambung ulang. */
  AUTH_EXPIRED: 'auth:expired',
} as const;
