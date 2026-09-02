import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/treino-de-garota/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['brand-mark.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Treino de Garota',
        short_name: 'treino',
        description: 'Seu treino, do jeito que aconteceu.',
        id: '/treino-de-garota/',
        theme_color: '#f6f1e3',
        background_color: '#f6f1e3',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/treino-de-garota/#/',
        scope: '/treino-de-garota/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'brand-mark.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        lang: 'pt-BR'
      },
      workbox: {
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,woff2}']
      }
    })
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
