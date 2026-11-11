import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// Library build: the three importable modules (`murte`, `murte/builder`,
// `murte/studio`).
// The Gallery and preview app are built by vite.apps.config.ts.
export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    lib: {
      entry: {
        'murte-core': resolve(__dirname, 'src/MurteCore/index.ts'),
        'murte-builder': resolve(__dirname, 'src/MurteBuilder/index.ts'),
        'murte-studio': resolve(__dirname, 'src/MurteStudio/index.ts')
      },
      formats: ['es']
    },
    rollupOptions: {
      output: { chunkFileNames: 'chunks/[name]-[hash].js' }
    }
  }
})
