import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/treino-de-garota/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['brand-mark.svg'],
      manifest: {
        name: 'Treino de Garota',
        short_name: 'treino',
        description: 'Seu treino, do jeito que aconteceu.',
        theme_color: '#f6f1e3',
        background_color: '#f6f1e3',
        display: 'standalone',
        start_url: '/treino-de-garota/#/',
        scope: '/treino-de-garota/',
        icons: [
          {
            src: 'brand-mark.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
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
