import { Outlet } from 'react-router'
import { useSeo } from '@/hooks/useSeo'
import { WorkspaceProvider } from '@/hooks/useWorkspace'
import { NotificationProvider } from '@/hooks/useNotifications'
import { RealtimeProvider } from '@/hooks/useRealtime'
import Sidebar from '@/components/dashboard/Sidebar'
import SyncNotice from './SyncNotice'

/** Kerangka laman aplikasi. Data kerja dimuat per pengguna dan dibuang saat keluar. */
export default function AppShell() {
  useSeo({ noindex: true })
  return (
    <WorkspaceProvider>
      <RealtimeProvider>
      <NotificationProvider>
        <div className="-mx-4 grid min-h-dvh grid-cols-[272px_minmax(0,1fr)] max-[900px]:grid-cols-1 max-[900px]:pb-24">
          <Sidebar />
          <main className="mx-auto flex w-full min-w-0 max-w-[1300px] flex-col gap-8 px-6 py-4 pb-12 max-[900px]:px-4">
            <Outlet />
          </main>
        </div>
        <SyncNotice />
      </NotificationProvider>
      </RealtimeProvider>
    </WorkspaceProvider>
  )
}
