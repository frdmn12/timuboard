import { useRef, type ReactNode } from 'react'
import { useAuthMotion } from '@/hooks/useAuthMotion'
import Logo from '@/components/common/Logo'
import ThemeToggle from '@/components/common/ThemeToggle'
import LangSwitch from '@/components/common/LangSwitch'
import AuthPanel from './AuthPanel'

/** Kerangka laman auth: konten di kiri, panel pratinjau di kanan. `motionKey` mengulang animasi saat konten berganti. */
export default function AuthLayout({ motionKey, children }: { motionKey: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useAuthMotion(root, motionKey)
  return (
    <div ref={root} className="mx-auto grid min-h-dvh max-w-[1400px] grid-cols-2 gap-4 py-4 max-[900px]:grid-cols-1">
      <main className="flex min-w-0 flex-col px-2 pb-8">
        <header className="flex items-center gap-2"><Logo className="mr-auto" /><LangSwitch /><ThemeToggle /></header>
        {children}
      </main>
      <AuthPanel />
    </div>
  )
}
