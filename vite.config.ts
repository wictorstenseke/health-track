/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// The commit hash (set by GitHub Actions) lets the phone show which build it is running.
const version = process.env.npm_package_version ?? 'dev'
const sha = process.env.GITHUB_SHA?.slice(0, 7)
const appVersion = sha ? `${version}+${sha}` : version

/**
 * GitHub Pages can't send headers, so the CSP is a meta tag. Build only: the dev server injects an inline
 * React Refresh script. Inline scripts (the dark-mode one in index.html) are allowed by hash, computed here.
 */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          ([, body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`,
        )
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "connect-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'none'",
        ].join('; ')
        return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }]
      },
    },
  }
}

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
    contentSecurityPolicy(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Veyin',
        short_name: 'Veyin',
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
