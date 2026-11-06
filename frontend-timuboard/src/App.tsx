import { Route, Routes } from 'react-router'
import { AuthProvider } from './components/auth/AuthProvider'
import { ProfileProvider } from './hooks/useProfile'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import CekEmail from './pages/CekEmail'
import Verifikasi from './pages/Verifikasi'
import LupaKataSandi from './pages/LupaKataSandi'
import AturUlangKataSandi from './pages/AturUlangKataSandi'
import Dashboard from './pages/Dashboard'
import Papan from './pages/Papan'
import Disematkan from './pages/Disematkan'
import Proyek from './pages/Proyek'
import Tim from './pages/Tim'
import Kalender from './pages/Kalender'
import Pengaturan from './pages/Pengaturan'
import Playground from './pages/Playground'
import NotFound from './pages/NotFound'
import AppShell from './components/layout/AppShell'
import LangScope from './components/layout/LangScope'
import { GuestRoute, ProtectedRoute } from './components/auth/RouteGuards'

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
          <Routes>
            {/* Satu induk untuk dua bahasa: /playground (Indonesia) dan /en/playground (Inggris). */}
            <Route path="/:lang?" element={<LangScope />}>
              <Route index element={<Landing />} />
              <Route path="playground" element={<Playground />} />
              <Route path="verifikasi" element={<Verifikasi />} />
              <Route path="atur-ulang-kata-sandi" element={<AturUlangKataSandi />} />
              <Route element={<GuestRoute />}>
                <Route path="masuk" element={<Auth mode="login" />} />
                <Route path="daftar" element={<Auth mode="register" />} />
                <Route path="cek-email" element={<CekEmail />} />
                <Route path="lupa-kata-sandi" element={<LupaKataSandi />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="papan" element={<Papan />} />
                  <Route path="disematkan" element={<Disematkan />} />
                  <Route path="proyek" element={<Proyek />} />
                  <Route path="tim" element={<Tim />} />
                  <Route path="kalender" element={<Kalender />} />
                  <Route path="pengaturan" element={<Pengaturan />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
      </ProfileProvider>
    </AuthProvider>
  )
}
