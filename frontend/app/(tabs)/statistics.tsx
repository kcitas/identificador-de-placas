import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { api, ApiError } from '../../src/api/client'
import type { StatisticsResponse } from '../../src/api/types'
import { ErrorBanner } from '../../src/components/ErrorBanner'
import { LoadingSpinner } from '../../src/components/LoadingSpinner'
import { Screen } from '../../src/components/Screen'
import { colors, mono, withAlpha } from '../../src/theme'

const STATUS_LABELS: Record<string, string> = {
  success: 'Reconocidas',
  low_confidence: 'Confianza baja',
  no_plate_detected: 'Sin placa',
  error: 'Error',
}

const STATUS_COLORS: Record<string, string> = {
  success: colors.success,
  low_confidence: colors.warning,
  no_plate_detected: colors.textMuted,
  error: colors.danger,
}

export default function Statistics() {
  const [stats, setStats] = useState<StatisticsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setStats(await api.statistics())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar las estadísticas.')
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  if (error) {
    return (
      <Screen>
        <ErrorBanner message={error} onRetry={load} />
      </Screen>
    )
  }
  if (!stats) {
    return (
      <Screen>
        <LoadingSpinner label="Cargando estadísticas…" />
      </Screen>
    )
  }

  const maxDay = Math.max(1, ...stats.recognitions_by_day.map((d) => d.count))
  const statusTotal = Math.max(1, stats.total_recognitions)

  return (
    <Screen>
      <Text style={styles.title}>Estadísticas</Text>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total</Text>
          <Text style={styles.big}>{stats.total_recognitions}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Tasa de éxito</Text>
          <Text style={[styles.big, { color: colors.accent }]}>{Math.round(stats.success_rate * 100)}%</Text>
        </View>
      </View>

      <View style={[styles.card, styles.section]}>
        <Text style={styles.sectionTitle}>Reconocimientos por día</Text>
        {stats.recognitions_by_day.length === 0 ? (
          <Text style={styles.muted}>Sin datos aún.</Text>
        ) : (
          <View style={styles.chart}>
            {stats.recognitions_by_day.map((d) => (
              <View key={d.date} style={styles.column}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { height: `${(d.count / maxDay) * 100}%`, minHeight: d.count > 0 ? 4 : 0 },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{d.date.slice(5)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.card, styles.section]}>
        <Text style={styles.sectionTitle}>Por estado</Text>
        <View style={styles.statusList}>
          {Object.entries(stats.recognitions_by_status).map(([status, count]) => (
            <View key={status}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{STATUS_LABELS[status] ?? status}</Text>
                <Text style={styles.statusCount}>{count}</Text>
              </View>
              <View style={styles.statusTrack}>
                <View
                  style={[
                    styles.statusFill,
                    { width: `${(count / statusTotal) * 100}%`, backgroundColor: STATUS_COLORS[status] },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Confianza promedio</Text>
          <Text style={styles.medium}>
            {stats.avg_confidence !== null ? `${Math.round(stats.avg_confidence * 100)}%` : '—'}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Tiempo promedio</Text>
          <Text style={styles.medium}>
            {stats.avg_processing_time_ms !== null ? `${Math.round(stats.avg_processing_time_ms)} ms` : '—'}
          </Text>
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  section: { flex: undefined, marginBottom: 24 },
  cardLabel: { fontSize: 12, color: colors.textMuted },
  big: { marginTop: 4, fontSize: 30, fontWeight: '700', color: colors.text, fontFamily: mono },
  medium: { marginTop: 4, fontSize: 24, fontWeight: '700', color: colors.text, fontFamily: mono },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: 12 },
  muted: { fontSize: 14, color: colors.textMuted },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 140 },
  column: { flex: 1, alignItems: 'center', gap: 4, height: '100%' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: withAlpha(colors.accent, 0.8) },
  barLabel: { fontSize: 10, color: colors.textMuted },
  statusList: { gap: 12 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  statusLabel: { fontSize: 14, color: colors.text },
  statusCount: { fontSize: 14, color: colors.textMuted, fontFamily: mono },
  statusTrack: { height: 6, width: '100%', borderRadius: 999, backgroundColor: colors.surface2, overflow: 'hidden' },
  statusFill: { height: '100%', borderRadius: 999 },
})
