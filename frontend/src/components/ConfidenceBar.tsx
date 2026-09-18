import { StyleSheet, Text, View } from 'react-native'
import { colors, mono } from '../theme'

export function ConfidenceBar({ value }: { value: number | null }) {
  if (value === null) {
    return <Text style={styles.empty}>Sin dato de confianza</Text>
  }
  const pct = Math.round(value * 100)
  const color = pct >= 70 ? colors.success : pct >= 40 ? colors.warning : colors.danger
  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerText}>Confianza</Text>
        <Text style={[styles.pct, { color }]}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { fontSize: 14, color: colors.textMuted },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerText: { fontSize: 12, color: colors.textMuted },
  pct: { fontSize: 12, fontWeight: '600', fontFamily: mono },
  track: { height: 8, width: '100%', borderRadius: 999, backgroundColor: colors.surface2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
})
