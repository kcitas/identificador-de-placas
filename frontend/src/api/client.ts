import type { Recognition, RecognitionListResponse, RecognitionStatus, StatisticsResponse } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, init)
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifica tu conexión o la URL de la API.', 0)
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? body.message ?? detail
    } catch {
      /* body wasn't json */
    }
    throw new ApiError(detail || `Error ${res.status}`, res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function resolveMediaUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_URL}${url}`
}

export const api = {
  health: () => request<{ status: string }>('/api/v1/health'),

  createRecognition: (image: File | Blob) => {
    const form = new FormData()
    form.append('image', image, image instanceof File ? image.name : 'capture.jpg')
    return request<Recognition>('/api/v1/recognitions', { method: 'POST', body: form })
  },

  listRecognitions: (params: { skip?: number; limit?: number; status?: RecognitionStatus } = {}) => {
    const qs = new URLSearchParams()
    if (params.skip !== undefined) qs.set('skip', String(params.skip))
    if (params.limit !== undefined) qs.set('limit', String(params.limit))
    if (params.status) qs.set('status', params.status)
    const query = qs.toString()
    return request<RecognitionListResponse>(`/api/v1/recognitions${query ? `?${query}` : ''}`)
  },

  getRecognition: (id: string) => request<Recognition>(`/api/v1/recognitions/${id}`),

  deleteRecognition: (id: string) => request<void>(`/api/v1/recognitions/${id}`, { method: 'DELETE' }),

  statistics: () => request<StatisticsResponse>('/api/v1/statistics'),
}
