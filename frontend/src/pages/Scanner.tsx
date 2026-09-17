import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, resolveMediaUrl } from '../api/client'
import type { Recognition } from '../api/types'
import { StatusBadge } from '../components/StatusBadge'
import { ConfidenceBar } from '../components/ConfidenceBar'
import { ErrorBanner } from '../components/ErrorBanner'
import { BBoxImage } from '../components/BBoxImage'

type Stage = 'camera' | 'preview' | 'uploading' | 'result'

export function Scanner() {
  const [stage, setStage] = useState<Stage>('camera')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [results, setResults] = useState<Recognition[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    stopStream()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setCameraError('No se pudo acceder a la cámara. Puedes seleccionar una foto de la galería.')
    }
  }, [stopStream])

  useEffect(() => {
    if (stage === 'camera') startCamera()
    return () => stopStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        setCapturedBlob(blob)
        setCapturedUrl(URL.createObjectURL(blob))
        stopStream()
        setStage('preview')
      },
      'image/jpeg',
      0.92,
    )
  }

  const handleGalleryPick = (file: File | null) => {
    if (!file) return
    setCapturedBlob(file)
    setCapturedUrl(URL.createObjectURL(file))
    stopStream()
    setStage('preview')
  }

  const handleRetake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedBlob(null)
    setCapturedUrl(null)
    setUploadError(null)
    setStage('camera')
  }

  const handleUpload = async () => {
    if (!capturedBlob) return
    setStage('uploading')
    setUploadError(null)
    try {
      const recognitions = await api.createRecognition(capturedBlob)
      setResults(recognitions)
      setStage('result')
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Error inesperado al procesar la imagen.')
      setStage('preview')
    }
  }

  const handleScanAnother = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedBlob(null)
    setCapturedUrl(null)
    setResults([])
    setUploadError(null)
    setStage('camera')
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-xl font-bold">Escanear placa</h1>

      {stage === 'camera' && (
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-(--color-border) bg-black">
            {!cameraError ? (
              <>
                <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-dashed border-(--color-accent)/70">
                  <div className="absolute left-0 right-0 top-0 h-0.5 bg-(--color-accent)/80 animate-scan-line" />
                </div>
                <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/80">
                  Encuadra la placa dentro del marco
                </p>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <ErrorBanner message={cameraError} onRetry={startCamera} />
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          <div className="mt-5 flex items-center justify-center gap-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 text-(--color-text-muted) transition hover:text-(--color-text)"
              aria-label="Elegir de la galería"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-(--color-border) bg-(--color-surface)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                  <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="1.6" />
                  <circle cx="8.5" cy="9.5" r="1.5" strokeWidth="1.6" />
                  <path d="M21 15l-5-5-9 9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-xs">Galería</span>
            </button>

            <button
              onClick={handleCapture}
              disabled={!!cameraError}
              className="animate-pulse-ring flex h-18 w-18 items-center justify-center rounded-full bg-(--color-accent) text-(--color-bg) transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:animate-none"
              style={{ width: '4.5rem', height: '4.5rem' }}
              aria-label="Capturar foto"
            >
              <span className="h-14 w-14 rounded-full border-4 border-(--color-bg)" />
            </button>

            <div className="w-11" />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleGalleryPick(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      {(stage === 'preview' || stage === 'uploading') && capturedUrl && (
        <div>
          <div className="overflow-hidden rounded-2xl border border-(--color-border)">
            <img src={capturedUrl} alt="Captura de la placa" className="w-full" />
          </div>

          {uploadError && (
            <div className="mt-4">
              <ErrorBanner message={uploadError} />
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={handleRetake}
              disabled={stage === 'uploading'}
              className="flex-1 rounded-xl border border-(--color-border) bg-(--color-surface) py-3 font-medium text-(--color-text) transition hover:bg-(--color-surface-2) disabled:opacity-50"
            >
              Volver a tomar
            </button>
            <button
              onClick={handleUpload}
              disabled={stage === 'uploading'}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-(--color-accent) py-3 font-semibold text-(--color-bg) transition active:scale-[0.98] disabled:opacity-60"
            >
              {stage === 'uploading' ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-(--color-bg)/30 border-t-(--color-bg)" />
                  Procesando…
                </>
              ) : (
                'Usar esta foto'
              )}
            </button>
          </div>
        </div>
      )}

      {stage === 'result' && results.length > 0 && (
        <div>
          <BBoxImage
            src={resolveMediaUrl(results[0].processed_image_url ?? results[0].original_image_url) ?? ''}
            bbox={results.length === 1 ? results[0].detected_bbox : null}
            alt="Resultado del reconocimiento"
          />

          {results.length > 1 && (
            <p className="mt-3 text-sm text-(--color-text-muted)">
              Se encontraron {results.length} placas en la foto.
            </p>
          )}

          <div className="mt-4 space-y-3">
            {results.map((result) => (
              <div key={result.id} className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-3xl font-extrabold tracking-widest">
                    {result.plate_text ?? 'No detectada'}
                  </span>
                  <StatusBadge status={result.status} />
                </div>

                {result.status === 'no_plate_detected' && (
                  <p className="mt-3 text-sm text-(--color-text-muted)">
                    No se detectó ninguna placa en la imagen. Intenta acercarte más o mejorar la iluminación.
                  </p>
                )}
                {result.status === 'error' && result.error_message && (
                  <div className="mt-3">
                    <ErrorBanner message={result.error_message} />
                  </div>
                )}

                <div className="mt-4">
                  <ConfidenceBar value={result.confidence} />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-(--color-text-muted)">
                  <span>Procesado en {result.processing_time_ms} ms</span>
                  <Link to={`/recognitions/${result.id}`} className="font-medium text-(--color-accent)">
                    Ver detalle →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <button
              onClick={handleScanAnother}
              className="w-full rounded-xl bg-(--color-accent) py-3 font-semibold text-(--color-bg) transition active:scale-[0.98]"
            >
              Escanear otra
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
