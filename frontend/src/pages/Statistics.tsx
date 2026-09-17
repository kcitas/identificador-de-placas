import { useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import type { StatisticsResponse } from '../api/types'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorBanner } from '../components/ErrorBanner'

const STATUS_LABELS: Record<string, string> = {
  success: 'Reconocidas',
  low_confidence: 'Confianza baja',
  no_plate_detected: 'Sin placa',
  error: 'Error',
}

const STATUS_COLORS: Record<string, string> = {
  success: 'var(--color-success)',
  low_confidence: 'var(--color-warning)',
  no_plate_detected: 'var(--color-text-muted)',
  error: 'var(--color-danger)',
}

export function Statistics() {
  const [stats, setStats] = useState<StatisticsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    try {
      setStats(await api.statistics())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar las estadísticas.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (error) return <ErrorBanner message={error} onRetry={load} />
  if (!stats) return <LoadingSpinner label="Cargando estadísticas…" />

  const maxDay = Math.max(1, ...stats.recognitions_by_day.map((d) => d.count))
  const statusTotal = Math.max(1, stats.total_recognitions)

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Estadísticas</h1>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
          <p className="text-xs text-(--color-text-muted)">Total</p>
          <p className="mt-1 font-mono text-3xl font-bold">{stats.total_recognitions}</p>
        </div>
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
          <p className="text-xs text-(--color-text-muted)">Tasa de éxito</p>
          <p className="mt-1 font-mono text-3xl font-bold text-(--color-accent)">
            {Math.round(stats.success_rate * 100)}%
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
        <h2 className="mb-3 text-sm font-semibold text-(--color-text-muted)">Reconocimientos por día</h2>
        {stats.recognitions_by_day.length === 0 ? (
          <p className="text-sm text-(--color-text-muted)">Sin datos aún.</p>
        ) : (
          <div className="flex h-32 items-end gap-1.5">
            {stats.recognitions_by_day.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-(--color-accent)/80 transition-all"
                  style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                  title={`${d.date}: ${d.count}`}
                />
                <span className="text-[10px] text-(--color-text-muted)">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
        <h2 className="mb-3 text-sm font-semibold text-(--color-text-muted)">Por estado</h2>
        <div className="flex flex-col gap-3">
          {Object.entries(stats.recognitions_by_status).map(([status, count]) => (
            <div key={status}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{STATUS_LABELS[status] ?? status}</span>
                <span className="font-mono text-(--color-text-muted)">{count}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--color-surface-2)">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(count / statusTotal) * 100}%`, background: STATUS_COLORS[status] }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
          <p className="text-xs text-(--color-text-muted)">Confianza promedio</p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {stats.avg_confidence !== null ? `${Math.round(stats.avg_confidence * 100)}%` : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
          <p className="text-xs text-(--color-text-muted)">Tiempo promedio</p>
          <p className="mt-1 font-mono text-2xl font-bold">
            {stats.avg_processing_time_ms !== null ? `${Math.round(stats.avg_processing_time_ms)} ms` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
