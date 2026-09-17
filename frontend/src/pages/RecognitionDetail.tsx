import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError, resolveMediaUrl } from '../api/client'
import type { Recognition } from '../api/types'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ErrorBanner } from '../components/ErrorBanner'
import { StatusBadge } from '../components/StatusBadge'
import { ConfidenceBar } from '../components/ConfidenceBar'
import { BBoxImage } from '../components/BBoxImage'

export function RecognitionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recognition, setRecognition] = useState<Recognition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = async () => {
    if (!id) return
    setError(null)
    try {
      setRecognition(await api.getRecognition(id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el reconocimiento.')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await api.deleteRecognition(id)
      navigate('/history')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar.')
      setDeleting(false)
    }
  }

  if (error) return <ErrorBanner message={error} onRetry={load} />
  if (!recognition) return <LoadingSpinner label="Cargando…" />

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/history" className="text-sm text-(--color-text-muted) hover:text-(--color-text)">
          ← Historial
        </Link>
        <StatusBadge status={recognition.status} />
      </div>

      <BBoxImage
        src={resolveMediaUrl(recognition.processed_image_url ?? recognition.original_image_url) ?? ''}
        bbox={recognition.detected_bbox}
        alt="Placa detectada"
      />

      <div className="mt-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
        <p className="text-center font-mono text-4xl font-extrabold tracking-widest">
          {recognition.plate_text ?? '—'}
        </p>

        {recognition.error_message && (
          <div className="mt-4">
            <ErrorBanner message={recognition.error_message} />
          </div>
        )}

        <div className="mt-4">
          <ConfidenceBar value={recognition.confidence} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-y-2 border-t border-(--color-border) pt-4 text-sm">
          <dt className="text-(--color-text-muted)">Fecha</dt>
          <dd className="text-right">{new Date(recognition.created_at).toLocaleString()}</dd>
          <dt className="text-(--color-text-muted)">Tiempo de proceso</dt>
          <dd className="text-right font-mono">{recognition.processing_time_ms} ms</dd>
          {recognition.detected_bbox && (
            <>
              <dt className="text-(--color-text-muted)">Bounding box</dt>
              <dd className="text-right font-mono text-xs">
                x:{recognition.detected_bbox.x} y:{recognition.detected_bbox.y} w:{recognition.detected_bbox.width} h:{recognition.detected_bbox.height}
              </dd>
            </>
          )}
          <dt className="text-(--color-text-muted)">ID</dt>
          <dd className="truncate text-right font-mono text-xs">{recognition.id}</dd>
        </dl>
      </div>

      {recognition.original_image_url !== recognition.processed_image_url && recognition.processed_image_url && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-(--color-text-muted)">Imagen original</p>
          <img
            src={resolveMediaUrl(recognition.original_image_url) ?? ''}
            alt="Original"
            className="w-full rounded-xl border border-(--color-border)"
          />
        </div>
      )}

      <div className="mt-5">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full rounded-xl border border-(--color-danger)/30 py-3 text-sm font-medium text-(--color-danger) transition hover:bg-(--color-danger)/10"
          >
            Eliminar reconocimiento
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 rounded-xl border border-(--color-border) py-3 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 rounded-xl bg-(--color-danger) py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {deleting ? 'Eliminando…' : 'Confirmar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
