import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('aws-amplify')) {
            return 'aws-amplify'
          }
          if (id.includes('node_modules')) {
            if (id.includes('vue')) {
              return 'vue'
            }
            return 'vendor'
          }
        }
      }
    }
  }
})
