import type { RecognitionStatus } from '../api/types'

const STYLES: Record<RecognitionStatus, { label: string; className: string }> = {
  success: { label: 'Reconocida', className: 'bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-(--color-success) border-(--color-success)/30' },
  low_confidence: { label: 'Confianza baja', className: 'bg-[color-mix(in_srgb,var(--color-warning)_18%,transparent)] text-(--color-warning) border-(--color-warning)/30' },
  no_plate_detected: { label: 'Sin placa detectada', className: 'bg-(--color-surface-2) text-(--color-text-muted) border-(--color-border)' },
  error: { label: 'Error', className: 'bg-[color-mix(in_srgb,var(--color-danger)_18%,transparent)] text-(--color-danger) border-(--color-danger)/30' },
}

export function StatusBadge({ status }: { status: RecognitionStatus }) {
  const s = STYLES[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  )
}
