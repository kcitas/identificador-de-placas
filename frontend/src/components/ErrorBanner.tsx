import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, withAlpha } from '../theme'

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.banner}>
      <Ionicons name="warning-outline" size={20} color={colors.danger} style={styles.icon} />
      <View style={styles.body}>
        <Text style={styles.text}>{message}</Text>
        {onRetry && (
          <Pressable onPress={onRetry} hitSlop={8}>
            <Text style={styles.retry}>Reintentar</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withAlpha(colors.danger, 0.3),
    backgroundColor: withAlpha(colors.danger, 0.1),
    padding: 16,
  },
  icon: { marginTop: 2 },
  body: { flex: 1 },
  text: { fontSize: 14, color: colors.danger },
  retry: { marginTop: 8, fontSize: 14, fontWeight: '500', color: colors.danger, textDecorationLine: 'underline' },
})
