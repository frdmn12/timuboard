import { io } from 'socket.io-client'
import { BASE, getAccessToken } from './api'

/**
 * Satu koneksi Socket.IO untuk seluruh aplikasi. Tidak tersambung sampai RealtimeProvider memanggil `connect()`.
 * `auth` berupa fungsi: setiap (re)koneksi memakai access token terbaru.
 */
export const socket = io(BASE, {
  autoConnect: false,
  transports: ['websocket'],
  auth: (cb) => cb({ token: getAccessToken() }),
})
