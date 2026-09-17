import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  server: {
    host: true,
    // Dev-only: the page is served over HTTPS (self-signed, required for camera
    // access) but the local backend runs plain HTTP — proxying here keeps the
    // request same-origin so the browser doesn't block it as mixed content.
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    // Mobile browsers require a secure context for camera access (getUserMedia).
    // Self-signed cert for LAN testing only — production uses nginx + a real cert on AWS.
    ...(command === 'serve' ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-icon.svg'],
      manifest: {
        name: 'PlateScan — Reconocimiento de Placas',
        short_name: 'PlateScan',
        description: 'Reconocimiento de placas vehiculares desde la cámara del celular',
        theme_color: '#0b0f1a',
        background_color: '#0b0f1a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/pwa-icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/pwa-icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
          { src: '/pwa-icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Never cache API calls — recognitions must always hit the network.
        navigateFallbackDenylist: [/^\/api\//, /^\/media\//],
      },
    }),
  ],
}))
