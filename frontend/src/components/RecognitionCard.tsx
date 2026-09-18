import { useRouter } from 'expo-router'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { resolveMediaUrl } from '../api/client'
import type { Recognition } from '../api/types'
import { colors, mono } from '../theme'
import { StatusBadge } from './StatusBadge'

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr} h`
  return new Date(iso).toLocaleDateString()
}

export function RecognitionCard({ recognition }: { recognition: Recognition }) {
  const router = useRouter()
  const thumb = resolveMediaUrl(recognition.processed_image_url ?? recognition.original_image_url)
  return (
    <Pressable
      onPress={() => router.push(`/recognitions/${recognition.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.thumb}>{thumb && <Image source={{ uri: thumb }} style={styles.thumbImage} />}</View>
      <View style={styles.body}>
        <Text style={styles.plate} numberOfLines={1}>
          {recognition.plate_text ?? '—'}
        </Text>
        <View style={styles.meta}>
          <StatusBadge status={recognition.status} />
          <Text style={styles.time}>{timeAgo(recognition.created_at)}</Text>
        </View>
      </View>
      {recognition.confidence !== null && (
        <Text style={styles.confidence}>{Math.round(recognition.confidence * 100)}%</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
  },
  pressed: { transform: [{ scale: 0.99 }], borderColor: colors.accent },
  thumb: { width: 80, height: 56, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surface2 },
  thumbImage: { width: '100%', height: '100%' },
  body: { flex: 1, minWidth: 0 },
  plate: { fontSize: 18, fontWeight: '700', letterSpacing: 1, color: colors.text, fontFamily: mono },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  time: { fontSize: 12, color: colors.textMuted },
  confidence: { fontSize: 14, fontWeight: '600', color: colors.textMuted, fontFamily: mono },
})
