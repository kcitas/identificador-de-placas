import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import type { ColorValue } from 'react-native'
import { colors } from '../../src/theme'

type IconName = keyof typeof Ionicons.glyphMap

function icon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color} size={size} />
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="scanner" options={{ title: 'Escanear', tabBarIcon: icon('scan-outline') }} />
      <Tabs.Screen name="history" options={{ title: 'Historial', tabBarIcon: icon('time-outline') }} />
      <Tabs.Screen name="statistics" options={{ title: 'Stats', tabBarIcon: icon('stats-chart-outline') }} />
    </Tabs>
  )
}
