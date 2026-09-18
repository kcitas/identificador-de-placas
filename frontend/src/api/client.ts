import Constants from 'expo-constants'
import { Platform } from 'react-native'
import type { Recognition, RecognitionListResponse, RecognitionStatus, StatisticsResponse } from './types'

// A native app can't use relative URLs, so in dev derive the backend host from
// the Metro dev server the phone is already talking to (same machine, port 8000).
// On web, dev talks to the local backend directly; a production web build is
// served behind the nginx gateway and calls same-origin.
function defaultApiUrl(): string {
  if (Platform.OS === 'web') return __DEV__ ? 'http://localhost:8000' : ''
  const host = Constants.expoConfig?.hostUri?.split(':')[0]
  return host ? `http://${host}:8000` : 'http://localhost:8000'
}

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || defaultApiUrl()).replace(/\/$/, '')

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

export interface CapturedImage {
  uri: string
  name?: string
  type?: string
}

export const api = {
  health: () => request<{ status: string }>('/api/v1/health'),

  createRecognition: async (image: CapturedImage) => {
    const form = new FormData()
    const name = image.name ?? 'capture.jpg'
    const type = image.type ?? 'image/jpeg'
    if (Platform.OS === 'web') {
      const blob = await (await fetch(image.uri)).blob()
      form.append('image', blob, name)
    } else {
      form.append('image', { uri: image.uri, name, type } as unknown as Blob)
    }
    // The pipeline returns one Recognition per plate found in the photo —
    // almost always one, but a shot with more than one vehicle can yield several.
    return request<Recognition[]>('/api/v1/recognitions', { method: 'POST', body: form })
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
