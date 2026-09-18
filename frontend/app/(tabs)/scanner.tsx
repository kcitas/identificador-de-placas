import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { api, ApiError, resolveMediaUrl, type CapturedImage } from '../../src/api/client'
import type { Recognition } from '../../src/api/types'
import { BBoxImage } from '../../src/components/BBoxImage'
import { Button } from '../../src/components/Button'
import { ConfidenceBar } from '../../src/components/ConfidenceBar'
import { ErrorBanner } from '../../src/components/ErrorBanner'
import { Screen } from '../../src/components/Screen'
import { StatusBadge } from '../../src/components/StatusBadge'
import { colors, mono, withAlpha } from '../../src/theme'

type Stage = 'camera' | 'preview' | 'uploading' | 'result'

function ScanLine() {
  const progress = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    )
    loop.start()
    return () => loop.stop()
  }, [progress])
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 200] })
  return <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
}

export default function Scanner() {
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)

  const [stage, setStage] = useState<Stage>('camera')
  const [captured, setCaptured] = useState<CapturedImage | null>(null)
  const [results, setResults] = useState<Recognition[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission()
  }, [permission, requestPermission])

  const cameraReady = !!permission?.granted

  const handleCapture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.92 })
    if (!photo?.uri) return
    setCaptured({ uri: photo.uri, name: 'capture.jpg', type: 'image/jpeg' })
    setStage('preview')
  }

  const handleGalleryPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.92 })
    if (result.canceled) return
    const asset = result.assets[0]
    setCaptured({ uri: asset.uri, name: asset.fileName ?? 'gallery.jpg', type: asset.mimeType ?? 'image/jpeg' })
    setStage('preview')
  }

  const reset = () => {
    setCaptured(null)
    setResults([])
    setUploadError(null)
    setStage('camera')
  }

  const handleUpload = async () => {
    if (!captured) return
    setStage('uploading')
    setUploadError(null)
    try {
      setResults(await api.createRecognition(captured))
      setStage('result')
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Error inesperado al procesar la imagen.')
      setStage('preview')
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Escanear placa</Text>

      {stage === 'camera' && (
        <View>
          <View style={styles.viewfinder}>
            {cameraReady ? (
              <>
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
                <View pointerEvents="none" style={styles.frame}>
                  <ScanLine />
                </View>
                <Text style={styles.hint}>Encuadra la placa dentro del marco</Text>
              </>
            ) : (
              <View style={styles.cameraError}>
                <ErrorBanner
                  message="No se pudo acceder a la cámara. Puedes seleccionar una foto de la galería."
                  onRetry={requestPermission}
                />
              </View>
            )}
          </View>

          <View style={styles.controls}>
            <Pressable onPress={handleGalleryPick} style={styles.galleryButton}>
              <View style={styles.galleryIcon}>
                <Ionicons name="image-outline" size={20} color={colors.textMuted} />
              </View>
              <Text style={styles.galleryLabel}>Galería</Text>
            </Pressable>

            <Pressable
              onPress={handleCapture}
              disabled={!cameraReady}
              style={({ pressed }) => [
                styles.shutter,
                pressed && { transform: [{ scale: 0.95 }] },
                !cameraReady && styles.shutterDisabled,
              ]}
            >
              <View style={styles.shutterInner} />
            </Pressable>

            <View style={{ width: 44 }} />
          </View>
        </View>
      )}

      {(stage === 'preview' || stage === 'uploading') && captured && (
        <View>
          <View style={styles.previewWrap}>
            <Image source={{ uri: captured.uri }} style={styles.preview} resizeMode="contain" />
          </View>

          {uploadError && (
            <View style={styles.gap}>
              <ErrorBanner message={uploadError} />
            </View>
          )}

          <View style={styles.row}>
            <Button label="Volver a tomar" variant="secondary" onPress={reset} disabled={stage === 'uploading'} style={styles.flex} />
            <Button
              label={stage === 'uploading' ? 'Procesando…' : 'Usar esta foto'}
              onPress={handleUpload}
              loading={stage === 'uploading'}
              style={styles.flex}
            />
          </View>
        </View>
      )}

      {stage === 'result' && results.length > 0 && (
        <View>
          <BBoxImage
            src={resolveMediaUrl(results[0].processed_image_url ?? results[0].original_image_url) ?? ''}
            bbox={results.length === 1 ? results[0].detected_bbox : null}
          />

          {results.length > 1 && (
            <Text style={styles.multi}>Se encontraron {results.length} placas en la foto.</Text>
          )}

          <View style={styles.results}>
            {results.map((result) => (
              <View key={result.id} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Text style={styles.plate}>{result.plate_text ?? 'No detectada'}</Text>
                  <StatusBadge status={result.status} />
                </View>

                {result.status === 'no_plate_detected' && (
                  <Text style={styles.resultNote}>
                    No se detectó ninguna placa en la imagen. Intenta acercarte más o mejorar la iluminación.
                  </Text>
                )}
                {result.status === 'error' && result.error_message && (
                  <View style={styles.gap}>
                    <ErrorBanner message={result.error_message} />
                  </View>
                )}

                <View style={styles.gap}>
                  <ConfidenceBar value={result.confidence} />
                </View>

                <View style={styles.resultFooter}>
                  <Text style={styles.footerText}>Procesado en {result.processing_time_ms} ms</Text>
                  <Pressable onPress={() => router.push(`/recognitions/${result.id}`)} hitSlop={8}>
                    <Text style={styles.link}>Ver detalle →</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          <Button label="Escanear otra" onPress={reset} style={styles.gap} />
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  viewfinder: {
    aspectRatio: 4 / 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  frame: {
    position: 'absolute',
    top: 24,
    right: 24,
    bottom: 24,
    left: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: withAlpha(colors.accent, 0.7),
    overflow: 'hidden',
  },
  scanLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundColor: withAlpha(colors.accent, 0.8) },
  hint: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  cameraError: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 20 },
  galleryButton: { alignItems: 'center', gap: 4 },
  galleryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryLabel: { fontSize: 12, color: colors.textMuted },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: { opacity: 0.4 },
  shutterInner: { width: 56, height: 56, borderRadius: 28, borderWidth: 4, borderColor: colors.bg },
  previewWrap: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: '#000' },
  preview: { width: '100%', aspectRatio: 4 / 3 },
  gap: { marginTop: 16 },
  row: { flexDirection: 'row', gap: 12, marginTop: 20 },
  flex: { flex: 1 },
  multi: { marginTop: 12, fontSize: 14, color: colors.textMuted },
  results: { marginTop: 16, gap: 12 },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  plate: { fontSize: 28, fontWeight: '800', letterSpacing: 3, color: colors.text, fontFamily: mono, flexShrink: 1 },
  resultNote: { marginTop: 12, fontSize: 14, color: colors.textMuted },
  resultFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  footerText: { fontSize: 12, color: colors.textMuted },
  link: { fontSize: 12, fontWeight: '500', color: colors.accent },
})
