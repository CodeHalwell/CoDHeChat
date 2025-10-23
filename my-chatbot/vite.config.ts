/// <reference types="vitest" />
/// <reference types="vitest" />
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['refractor/lib/core', 'refractor/lib/all'],
    },
  },
})
