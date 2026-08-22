import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { BASE } from './site.config.mjs'

// https://vite.dev/config/
export default defineConfig({
  // Where the site is served from: see site.config.mjs, which the prerender
  // pass and the share card read too, so they cannot disagree with this.
  base: BASE,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
