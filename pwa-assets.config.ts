import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

// The icon is full-bleed, so no padding (the preset would add white padding to apple/maskable icons).
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    transparent: { ...preset.transparent, padding: 0 },
    maskable: { ...preset.maskable, padding: 0 },
    apple: { ...preset.apple, padding: 0 },
  },
  images: ['public/icon.svg'],
})
