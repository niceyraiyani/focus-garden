/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `base` must match how the app is hosted:
//  - dev server runs at '/'
//  - GitHub Pages project site is served from '/<repo>/'
// Override with the VITE_BASE env var (e.g. '/' for a user/organization page).
export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE ?? (command === 'build' ? '/focus-garden/' : '/'),
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
  },
}))
