export type RecognitionStatus = 'success' | 'no_plate_detected' | 'low_confidence' | 'error'

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface Recognition {
  id: string
  plate_text: string | null
  confidence: number | null
  original_image_url: string
  processed_image_url: string | null
  detected_bbox: BoundingBox | null
  processing_time_ms: number
  status: RecognitionStatus
  error_message: string | null
  created_at: string
}

export interface RecognitionListResponse {
  items: Recognition[]
  total: number
  skip: number
  limit: number
}

export interface StatisticsResponse {
  total_recognitions: number
  success_count: number
  success_rate: number
  avg_confidence: number | null
  avg_processing_time_ms: number | null
  recognitions_by_day: { date: string; count: number }[]
  recognitions_by_status: Record<RecognitionStatus, number>
}
