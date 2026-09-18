import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { api, ApiError, resolveMediaUrl } from '../../src/api/client'
import type { Recognition } from '../../src/api/types'
import { BBoxImage } from '../../src/components/BBoxImage'
import { Button } from '../../src/components/Button'
import { ConfidenceBar } from '../../src/components/ConfidenceBar'
import { ErrorBanner } from '../../src/components/ErrorBanner'
import { LoadingSpinner } from '../../src/components/LoadingSpinner'
import { Screen } from '../../src/components/Screen'
import { StatusBadge } from '../../src/components/StatusBadge'
import { colors, mono } from '../../src/theme'

export default function RecognitionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [recognition, setRecognition] = useState<Recognition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/history'))

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      setRecognition(await api.getRecognition(id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el reconocimiento.')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    try {
      await api.deleteRecognition(id)
      router.replace('/history')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar.')
      setDeleting(false)
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={8}>
          <Text style={styles.back}>← Historial</Text>
        </Pressable>
        {recognition && <StatusBadge status={recognition.status} />}
      </View>

      {error && <ErrorBanner message={error} onRetry={load} />}
      {!error && !recognition && <LoadingSpinner label="Cargando…" />}

      {recognition && (
        <View style={styles.content}>
          <BBoxImage
            src={resolveMediaUrl(recognition.processed_image_url ?? recognition.original_image_url) ?? ''}
            bbox={recognition.detected_bbox}
          />

          <View style={styles.card}>
            <Text style={styles.plate}>{recognition.plate_text ?? '—'}</Text>

            {recognition.error_message && (
              <View style={styles.gap}>
                <ErrorBanner message={recognition.error_message} />
              </View>
            )}

            <View style={styles.gap}>
              <ConfidenceBar value={recognition.confidence} />
            </View>

            <View style={styles.details}>
              <Row label="Fecha" value={new Date(recognition.created_at).toLocaleString()} />
              <Row label="Tiempo de proceso" value={`${recognition.processing_time_ms} ms`} mono />
              {recognition.detected_bbox && (
                <Row
                  label="Bounding box"
                  value={`x:${recognition.detected_bbox.x} y:${recognition.detected_bbox.y} w:${recognition.detected_bbox.width} h:${recognition.detected_bbox.height}`}
                  mono
                  small
                />
              )}
              <Row label="ID" value={recognition.id} mono small />
            </View>
          </View>

          {recognition.processed_image_url && recognition.original_image_url !== recognition.processed_image_url && (
            <View style={styles.gap}>
              <Text style={styles.sectionLabel}>Imagen original</Text>
              <Image
                source={{ uri: resolveMediaUrl(recognition.original_image_url) ?? '' }}
                style={styles.original}
                resizeMode="contain"
              />
            </View>
          )}

          <View style={styles.actions}>
            {!confirmDelete ? (
              <Button label="Eliminar reconocimiento" variant="danger-outline" onPress={() => setConfirmDelete(true)} />
            ) : (
              <View style={styles.row}>
                <Button label="Cancelar" variant="secondary" onPress={() => setConfirmDelete(false)} style={styles.flex} />
                <Button
                  label={deleting ? 'Eliminando…' : 'Confirmar'}
                  variant="danger"
                  onPress={handleDelete}
                  loading={deleting}
                  style={styles.flex}
                />
              </View>
            )}
          </View>
        </View>
      )}
    </Screen>
  )
}

function Row({ label, value, mono: isMono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, isMono && { fontFamily: mono }, small && { fontSize: 12 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  back: { fontSize: 14, color: colors.textMuted },
  content: { width: '100%', maxWidth: 448, alignSelf: 'center' },
  card: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  plate: { textAlign: 'center', fontSize: 36, fontWeight: '800', letterSpacing: 4, color: colors.text, fontFamily: mono },
  gap: { marginTop: 16 },
  details: { marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  detailLabel: { fontSize: 14, color: colors.textMuted },
  detailValue: { fontSize: 14, color: colors.text, flexShrink: 1, textAlign: 'right' },
  sectionLabel: { fontSize: 14, color: colors.textMuted, marginBottom: 8 },
  original: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  actions: { marginTop: 20 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
})
