import { ScrollViewStyleReset } from 'expo-router/html'
import type { PropsWithChildren } from 'react'

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>PlateScan</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html{color-scheme:dark}body{background:#0b0f1a}' }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
