import { Platform } from 'react-native'

export const colors = {
  bg: '#0b0f1a',
  surface: '#131a29',
  surface2: '#1a2332',
  border: '#253044',
  text: '#e8ecf4',
  textMuted: '#8b96ab',
  accent: '#38e0c8',
  accent2: '#6d5bff',
  danger: '#ff5c72',
  warning: '#ffb648',
  success: '#38e0c8',
}

export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, Menlo, Consolas, monospace',
}) as string

export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
