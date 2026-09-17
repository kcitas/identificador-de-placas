import { Link } from 'react-router-dom'
import type { Recognition } from '../api/types'
import { resolveMediaUrl } from '../api/client'
import { StatusBadge } from './StatusBadge'

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr} h`
  return new Date(iso).toLocaleDateString()
}

export function RecognitionCard({ recognition }: { recognition: Recognition }) {
  const thumb = resolveMediaUrl(recognition.processed_image_url ?? recognition.original_image_url)
  return (
    <Link
      to={`/recognitions/${recognition.id}`}
      className="flex items-center gap-3 rounded-xl border border-(--color-border) bg-(--color-surface) p-3 transition hover:border-(--color-accent)/40 active:scale-[0.99]"
    >
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-(--color-surface-2)">
        {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-lg font-bold tracking-wide text-(--color-text)">
            {recognition.plate_text ?? '—'}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <StatusBadge status={recognition.status} />
          <span className="text-xs text-(--color-text-muted)">{timeAgo(recognition.created_at)}</span>
        </div>
      </div>
      {recognition.confidence !== null && (
        <span className="shrink-0 font-mono text-sm font-semibold text-(--color-text-muted)">
          {Math.round(recognition.confidence * 100)}%
        </span>
      )}
    </Link>
  )
}
