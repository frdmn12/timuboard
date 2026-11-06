import { Button } from '@/components/ui/button'
import { reactions, type ReactionKind } from '@/data/playground'
import { useI18n } from '@/hooks/useI18n'

export default function ReactionBar({ onReact, disabled }: { onReact: (k: ReactionKind) => void; disabled: boolean }) {
  const { t, tx } = useI18n()
  return (
    <div role="group" aria-label={t('Kirim reaksi ke semua orang di ruang ini', 'Send a reaction to everyone in this room')} className="flex flex-wrap items-center gap-2">
      <span className="mr-2 text-sm font-medium">{t('Reaksi', 'React')}</span>
      {reactions.map(({ kind, label, Icon }) => (
        <Button key={kind} variant="secondary" size="icon" disabled={disabled} onClick={() => onReact(kind)} aria-label={tx(label)} title={tx(label)}>
          <Icon strokeWidth={1.75} aria-hidden="true" />
        </Button>
      ))}
    </div>
  )
}
