import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { api, ApiError } from '../../src/api/client'
import type { Recognition, StatisticsResponse } from '../../src/api/types'
import { ErrorBanner } from '../../src/components/ErrorBanner'
import { LoadingSpinner } from '../../src/components/LoadingSpinner'
import { RecognitionCard } from '../../src/components/RecognitionCard'
import { Screen } from '../../src/components/Screen'
import { colors, mono } from '../../src/theme'

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, accent && { color: colors.accent }]}>{value}</Text>
    </View>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<StatisticsResponse | null>(null)
  const [recent, setRecent] = useState<Recognition[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [s, r] = await Promise.all([api.statistics(), api.listRecognitions({ limit: 5 })])
      setStats(s)
      setRecent(r.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el dashboard.')
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>PlateScan</Text>
        <Text style={styles.subtitle}>Reconocimiento de placas vehiculares</Text>
      </View>

      <Pressable
        onPress={() => router.push('/scanner')}
        style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.99 }] }]}
      >
        <View>
          <Text style={styles.ctaTitle}>Escanear una placa</Text>
          <Text style={styles.ctaSubtitle}>Usa la cámara de tu celular</Text>
        </View>
        <Ionicons name="scan-outline" size={32} color={colors.bg} />
      </Pressable>

      {error && (
        <View style={styles.section}>
          <ErrorBanner message={error} onRetry={load} />
        </View>
      )}

      {!stats && !error && <LoadingSpinner label="Cargando estadísticas…" />}

      {stats && (
        <View style={[styles.section, styles.grid]}>
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
        </View>
      )}

      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>Recientes</Text>
        <Pressable onPress={() => router.push('/history')} hitSlop={8}>
          <Text style={styles.link}>Ver todo</Text>
        </Pressable>
      </View>

      {recent && recent.length === 0 && (
        <Text style={styles.empty}>Aún no hay reconocimientos. Escanea tu primera placa.</Text>
      )}

      <View style={styles.list}>
        {recent?.map((r) => (
          <RecognitionCard key={r.id} recognition={r} />
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    backgroundColor: colors.accent,
    padding: 20,
    marginBottom: 24,
  },
  ctaTitle: { fontSize: 18, fontWeight: '700', color: colors.bg },
  ctaSubtitle: { fontSize: 14, color: colors.bg, opacity: 0.8 },
  section: { marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  tileLabel: { fontSize: 12, color: colors.textMuted },
  tileValue: { marginTop: 4, fontSize: 24, fontWeight: '700', color: colors.text, fontFamily: mono },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  recentTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  link: { fontSize: 14, color: colors.accent },
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
})
