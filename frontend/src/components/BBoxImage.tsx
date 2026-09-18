import { useEffect, useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import type { BoundingBox } from '../api/types'
import { colors } from '../theme'

export function BBoxImage({ src, bbox }: { src: string; bbox?: BoundingBox | null }) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    setNatural(null)
    Image.getSize(
      src,
      (w, h) => {
        if (!cancelled) setNatural({ w, h })
      },
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [src])

  const aspectRatio = natural ? natural.w / natural.h : 4 / 3

  return (
    <View style={[styles.wrap, { aspectRatio }]}>
      <Image source={{ uri: src }} style={styles.image} resizeMode="contain" />
      {bbox && natural && (
        <View
          pointerEvents="none"
          style={[
            styles.box,
            {
              left: `${(bbox.x / natural.w) * 100}%`,
              top: `${(bbox.y / natural.h) * 100}%`,
              width: `${(bbox.width / natural.w) * 100}%`,
              height: `${(bbox.height / natural.h) * 100}%`,
            },
          ]}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface2 },
  image: { width: '100%', height: '100%' },
  box: { position: 'absolute', borderRadius: 6, borderWidth: 2, borderColor: colors.accent },
})
