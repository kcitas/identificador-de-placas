import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native'
import { colors, withAlpha } from '../theme'

type Variant = 'primary' | 'secondary' | 'danger' | 'danger-outline'

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  label: string
  onPress: () => void
  variant?: Variant
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const isDisabled = disabled || loading
  const spinnerColor = variant === 'primary' ? colors.bg : variant === 'secondary' ? colors.text : '#fff'
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading && <ActivityIndicator size="small" color={spinnerColor} />}
      <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  label: { fontSize: 15, fontWeight: '600' },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  'danger-outline': { borderWidth: 1, borderColor: withAlpha(colors.danger, 0.3) },
})

const labelStyles = StyleSheet.create({
  primary: { color: colors.bg },
  secondary: { color: colors.text, fontWeight: '500' },
  danger: { color: '#fff' },
  'danger-outline': { color: colors.danger, fontWeight: '500' },
})
