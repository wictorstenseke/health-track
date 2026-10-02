/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// The commit hash (set by GitHub Actions) lets the phone show which build it is running.
const version = process.env.npm_package_version ?? 'dev'
const sha = process.env.GITHUB_SHA?.slice(0, 7)
const appVersion = sha ? `${version}+${sha}` : version

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the repo at /health-track/
  base: '/health-track/',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: { host: true },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Vågen',
        short_name: 'Vågen',
        description: 'Vikt och mått, offline.',
        lang: 'sv',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        theme_color: '#f2f2f4',
        background_color: '#f2f2f4',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
