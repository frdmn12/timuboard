import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors'
import { useI18n } from '@/hooks/useI18n'

const MAX = 2000

export default function CommentComposer({ onSend }: { onSend: (body: string) => Promise<void> }) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const body = text.trim()
  const canSend = body.length > 0 && body.length <= MAX && !busy

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!canSend) return
    setBusy(true); setError('')
    try { await onSend(body); setText(''); ref.current?.focus() } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send() }
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-2">
      <label htmlFor="comment-body" className="sr-only">{t('Tulis komentar', 'Write a comment')}</label>
      <textarea id="comment-body" ref={ref} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} rows={3} placeholder={t('Tulis komentar…', 'Write a comment…')} aria-invalid={body.length > MAX}
        className="min-h-20 w-full resize-y rounded-image border-2 border-transparent bg-input px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring aria-invalid:border-destructive" />
      {error && <p role="alert" className="text-sm leading-snug"><span className="mr-2 inline-block size-2 rounded-full bg-destructive" aria-hidden="true" />{error}</p>}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{t('Ctrl/⌘ + Enter untuk kirim', 'Ctrl/⌘ + Enter to send')}{body.length > MAX - 200 && <> · <span className={body.length > MAX ? 'font-medium text-foreground' : ''}>{body.length}/{MAX}</span></>}</span>
        <Button type="submit" className="ml-auto" disabled={!canSend}><SendHorizontal strokeWidth={1.75} aria-hidden="true" />{busy ? t('Mengirim…', 'Sending…') : t('Kirim', 'Send')}</Button>
      </div>
    </form>
  )
}
