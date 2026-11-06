import { useSeo } from '@/hooks/useSeo'
import { useI18n } from '@/hooks/useI18n'
import { usePlayground } from '@/hooks/usePlayground'
import PlaygroundNav from '@/components/playground/PlaygroundNav'
import PlaygroundIntro from '@/components/playground/PlaygroundIntro'
import DemoBoard from '@/components/playground/DemoBoard'
import ReactionBar from '@/components/playground/ReactionBar'
import PresencePanel from '@/components/playground/PresencePanel'
import GuestNameForm from '@/components/playground/GuestNameForm'
import ActivityFeed from '@/components/playground/ActivityFeed'
import LocationToggle from '@/components/playground/LocationToggle'
import SiteFooter from '@/components/landing/SiteFooter'

/** Laman publik: tamu tanpa akun mencoba papan bersama dan melihat siapa saja yang sedang online. */
export default function Playground() {
  const pg = usePlayground()
  const { t } = useI18n()
  useSeo({ title: 'Playground', path: '/playground', description: t('Coba Timuboard tanpa akun: geser kartu di papan demo bersama pengunjung lain, kirim reaksi, dan lihat siapa yang sedang online.', 'Try Timuboard without an account: move cards on a shared demo board with other visitors, send reactions, and see who’s online.') })
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 pt-4">
      <PlaygroundNav />
      <PlaygroundIntro status={pg.status} total={pg.total} room={pg.room} />
      <div className="grid gap-6 min-[1100px]:grid-cols-[1fr_320px] min-[1100px]:items-start">
        <main className="flex min-w-0 flex-col gap-4">
          <ReactionBar onReact={pg.react} disabled={pg.status !== 'online'} />
          <DemoBoard socket={pg.socket} board={pg.board} floating={pg.floating} onMove={pg.moveTask} />
          <p className="text-sm">{t('Papan ini dipakai bersama semua orang di ruangmu dan kembali bersih saat ruang kosong.', 'Everyone in your room shares this board. It resets when the room is empty.')}</p>
        </main>
        <aside className="flex flex-col gap-4" aria-label={t('Siapa yang online', 'Who’s online')}>
          <GuestNameForm key={pg.self?.name} name={pg.self?.name ?? ''} onRename={pg.rename} />
          <LocationToggle sharing={pg.sharing} disabled={pg.status !== 'online'} onChange={pg.shareLocation} />
          <PresencePanel members={pg.members} selfId={pg.self?.id} total={pg.total} room={pg.room} />
          <ActivityFeed items={pg.activity} />
        </aside>
      </div>
      <SiteFooter />
    </div>
  )
}
