import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Recognition, StatisticsResponse } from '../api/types'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorBanner } from '../components/ErrorBanner'
import { RecognitionCard } from '../components/RecognitionCard'

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-3.5">
      <p className="text-xs text-(--color-text-muted)">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold ${accent ? 'text-(--color-accent)' : 'text-(--color-text)'}`}>
        {value}
      </p>
    </div>
  )
}

export function Dashboard() {
  const [stats, setStats] = useState<StatisticsResponse | null>(null)
  const [recent, setRecent] = useState<Recognition[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    try {
      const [s, r] = await Promise.all([api.statistics(), api.listRecognitions({ limit: 5 })])
      setStats(s)
      setRecent(r.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el dashboard.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">PlateScan</h1>
        <p className="text-sm text-(--color-text-muted)">Reconocimiento de placas vehiculares</p>
      </div>

      <Link
        to="/scanner"
        className="mb-6 flex items-center justify-between rounded-2xl bg-gradient-to-r from-(--color-accent-2) to-(--color-accent) p-5 text-(--color-bg) shadow-lg shadow-(--color-accent)/10 transition active:scale-[0.99]"
      >
        <div>
          <p className="text-lg font-bold">Escanear una placa</p>
          <p className="text-sm opacity-80">Usa la cámara de tu celular</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-8 w-8">
          <path d="M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2M20 7V5a1 1 0 0 0-1-1h-2M20 17v2a1 1 0 0 1-1 1h-2M3 12h18" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      )}

      {!stats && !error && <LoadingSpinner label="Cargando estadísticas…" />}

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <StatTile label="Reconocimientos" value={String(stats.total_recognitions)} />
          <StatTile label="Tasa de éxito" value={`${Math.round(stats.success_rate * 100)}%`} accent />
          <StatTile
            label="Confianza promedio"
            value={stats.avg_confidence !== null ? `${Math.round(stats.avg_confidence * 100)}%` : '—'}
          />
          <StatTile
            label="Tiempo promedio"
            value={stats.avg_processing_time_ms !== null ? `${Math.round(stats.avg_processing_time_ms)} ms` : '—'}
          />
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Recientes</h2>
        <Link to="/history" className="text-sm text-(--color-accent)">
          Ver todo
        </Link>
      </div>

      {recent && recent.length === 0 && (
        <p className="rounded-xl border border-dashed border-(--color-border) p-6 text-center text-sm text-(--color-text-muted)">
          Aún no hay reconocimientos. Escanea tu primera placa.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {recent?.map((r) => (
          <RecognitionCard key={r.id} recognition={r} />
        ))}
      </div>
    </div>
  )
}
