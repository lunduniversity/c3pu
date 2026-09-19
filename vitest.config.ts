import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // The memory grid renders 256 rows, each now with a handle + 4 action
    // buttons on top of the bit toggles (mouse-first interaction model) -
    // a full render/interaction test can occasionally cross the 5s default
    // under sandboxed/CI load even though it's not actually hung.
    testTimeout: 10000,
  },
})
