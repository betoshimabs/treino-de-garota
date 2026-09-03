import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

declare const process: { env: Record<string, string | undefined> }

const builtAt = new Date().toISOString()
const configuredBase = process.env.VITE_BASE_PATH ?? '/'
const basePath = configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`
const packageVersion = process.env.npm_package_version ?? '0.1.0'
const [major = '0', minor = '1'] = packageVersion.split('.')
const runNumber = process.env.GITHUB_RUN_NUMBER
const runAttempt = process.env.GITHUB_RUN_ATTEMPT ?? '1'
const commit = process.env.GITHUB_SHA ?? 'local'
const appVersion = runNumber
  ? `${major}.${minor}.${runNumber}${runAttempt === '1' ? '' : `-r${runAttempt}`}`
  : `${packageVersion}-dev`
const appBuildId = runNumber
  ? `${process.env.GITHUB_RUN_ID ?? runNumber}.${runAttempt}.${commit}`
  : `local.${builtAt}`
const release = { version: appVersion, buildId: appBuildId, builtAt }

export default defineConfig({
  base: basePath,
  define: {
    __APP_VERSION__: JSON.stringify(release.version),
    __APP_BUILD_ID__: JSON.stringify(release.buildId),
    __APP_BUILT_AT__: JSON.stringify(release.builtAt),
  },
  plugins: [
    react(),
    {
      name: 'brabita-version',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: `${JSON.stringify(release, null, 2)}\n`,
        })
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'brabita-favicon-32.png',
        'brabita-apple-touch-icon.png',
        'brabita-icon-192.png',
        'brabita-icon-512.png',
        'brabita-icon-512-maskable.png',
      ],
      manifest: {
        name: 'Brabita',
        short_name: 'Brabita',
        description: 'Seu treino, do jeito que aconteceu.',
        id: basePath,
        theme_color: '#f6f1e3',
        background_color: '#f6f1e3',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: `${basePath}#/`,
        scope: basePath,
        icons: [
          {
            src: 'brabita-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'brabita-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'brabita-icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        lang: 'pt-BR'
      },
      workbox: {
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3_100_000
      }
    })
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
