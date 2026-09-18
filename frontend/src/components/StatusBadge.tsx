import { StyleSheet, Text, View } from 'react-native'
import type { RecognitionStatus } from '../api/types'
import { colors, withAlpha } from '../theme'

const STYLES: Record<RecognitionStatus, { label: string; color: string; bg: string }> = {
  success: { label: 'Reconocida', color: colors.success, bg: withAlpha(colors.success, 0.18) },
  low_confidence: { label: 'Confianza baja', color: colors.warning, bg: withAlpha(colors.warning, 0.18) },
  no_plate_detected: { label: 'Sin placa detectada', color: colors.textMuted, bg: colors.surface2 },
  error: { label: 'Error', color: colors.danger, bg: withAlpha(colors.danger, 0.18) },
}

export function StatusBadge({ status }: { status: RecognitionStatus }) {
  const s = STYLES[status]
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: withAlpha(s.color, 0.3) }]}>
      <View style={[styles.dot, { backgroundColor: s.color }]} />
      <Text style={[styles.label, { color: s.color }]}>{s.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, fontWeight: '500' },
})
