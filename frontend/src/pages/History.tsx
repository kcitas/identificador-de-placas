import { useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import type { Recognition, RecognitionStatus } from '../api/types'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorBanner } from '../components/ErrorBanner'
import { RecognitionCard } from '../components/RecognitionCard'

const FILTERS: { value: RecognitionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'success', label: 'Reconocidas' },
  { value: 'low_confidence', label: 'Confianza baja' },
  { value: 'no_plate_detected', label: 'Sin placa' },
  { value: 'error', label: 'Error' },
]

const PAGE_SIZE = 20

export function History() {
  const [filter, setFilter] = useState<RecognitionStatus | 'all'>('all')
  const [items, setItems] = useState<Recognition[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async (status: RecognitionStatus | 'all') => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.listRecognitions({
        limit: PAGE_SIZE,
        skip: 0,
        status: status === 'all' ? undefined : status,
      })
      setItems(res.items)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el historial.')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    try {
      const res = await api.listRecognitions({
        limit: PAGE_SIZE,
        skip: items.length,
        status: filter === 'all' ? undefined : filter,
      })
      setItems((prev) => [...prev, ...res.items])
      setTotal(res.total)
    } catch {
      /* silent — keep existing list on load-more failure */
    }
  }

  useEffect(() => {
    load(filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Historial</h1>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f.value
                ? 'border-(--color-accent) bg-(--color-accent)/10 text-(--color-accent)'
                : 'border-(--color-border) text-(--color-text-muted) hover:text-(--color-text)'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner label="Cargando historial…" />}
      {error && <ErrorBanner message={error} onRetry={() => load(filter)} />}

      {!loading && !error && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-(--color-border) p-6 text-center text-sm text-(--color-text-muted)">
          No hay reconocimientos con este filtro.
        </p>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-2">
          {items.map((r) => (
            <RecognitionCard key={r.id} recognition={r} />
          ))}
        </div>
      )}

      {!loading && !error && items.length < total && (
        <button
          onClick={loadMore}
          className="mt-4 w-full rounded-xl border border-(--color-border) py-2.5 text-sm font-medium text-(--color-text-muted) transition hover:bg-(--color-surface)"
        >
          Cargar más ({items.length}/{total})
        </button>
      )}
    </div>
  )
}
