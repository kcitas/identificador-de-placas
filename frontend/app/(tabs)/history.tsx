import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { api, ApiError } from '../../src/api/client'
import type { Recognition, RecognitionStatus } from '../../src/api/types'
import { ErrorBanner } from '../../src/components/ErrorBanner'
import { LoadingSpinner } from '../../src/components/LoadingSpinner'
import { RecognitionCard } from '../../src/components/RecognitionCard'
import { Screen } from '../../src/components/Screen'
import { colors, withAlpha } from '../../src/theme'

type Filter = RecognitionStatus | 'all'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'success', label: 'Reconocidas' },
  { value: 'low_confidence', label: 'Confianza baja' },
  { value: 'no_plate_detected', label: 'Sin placa' },
  { value: 'error', label: 'Error' },
]

const PAGE_SIZE = 20

export default function History() {
  const [filter, setFilter] = useState<Filter>('all')
  const [items, setItems] = useState<Recognition[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (status: Filter) => {
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
  }, [])

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

  useFocusEffect(
    useCallback(() => {
      load(filter)
    }, [load, filter]),
  )

  return (
    <Screen>
      <Text style={styles.title}>Historial</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.value
          return (
            <Pressable
              key={f.value}
              onPress={() => setFilter(f.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{f.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {loading && <LoadingSpinner label="Cargando historial…" />}
      {error && <ErrorBanner message={error} onRetry={() => load(filter)} />}

      {!loading && !error && items.length === 0 && (
        <Text style={styles.empty}>No hay reconocimientos con este filtro.</Text>
      )}

      {!loading && !error && (
        <View style={styles.list}>
          {items.map((r) => (
            <RecognitionCard key={r.id} recognition={r} />
          ))}
        </View>
      )}

      {!loading && !error && items.length < total && (
        <Pressable onPress={loadMore} style={styles.more}>
          <Text style={styles.moreLabel}>
            Cargar más ({items.length}/{total})
          </Text>
        </Pressable>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  filters: { flexDirection: 'row', gap: 8, paddingBottom: 4, marginBottom: 16 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, 0.1) },
  chipLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  chipLabelActive: { color: colors.accent },
  empty: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: 24,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
  list: { gap: 8 },
  more: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  moreLabel: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
})
