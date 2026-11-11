import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// The runnable apps: MurteGallery, MurteStudio, and examples/MurtePreviewApp.
export default defineConfig({
  root: __dirname,
  build: {
    target: 'es2022',
    outDir: 'dist/apps',
    rollupOptions: {
      input: {
        gallery: resolve(__dirname, 'src/MurteGallery/index.html'),
        studio: resolve(__dirname, 'src/MurteStudio/index.html'),
        preview: resolve(__dirname, 'examples/MurtePreviewApp/index.html')
      }
    }
  }
})
