import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme'

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={colors.accent} />
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 32 },
  label: { fontSize: 14, color: colors.textMuted },
})
