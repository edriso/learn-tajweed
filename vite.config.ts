import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { BASE, REPO_URL } from './site.config.mjs'

// https://vite.dev/config/
export default defineConfig({
  // Where the site is served from: see site.config.mjs, which the prerender
  // pass and the share card read too, so they cannot disagree with this.
  base: BASE,
  // Baked in at build time so a fork's footer links to the fork, not to us.
  // See repoUrl() in site.config.mjs for where the value comes from.
  define: { __REPO_URL__: JSON.stringify(REPO_URL) },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
