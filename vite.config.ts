import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // Firebase chunk (large library)
            if (id.includes('firebase')) {
              return 'vendor-firebase'
            }
            // Chart.js chunk
            if (id.includes('chart.js') || id.includes('vue-chartjs')) {
              return 'vendor-charts'
            }
            // Vue ecosystem
            if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
              return 'vendor-vue'
            }
            // UI libraries
            if (id.includes('lucide-vue-next') || id.includes('leaflet')) {
              return 'vendor-ui'
            }
            // Other node_modules
            return 'vendor'
          }
          
          // Admin-specific chunks
          if (id.includes('/admin/')) {
            return 'admin'
          }
          
          // Employee-specific chunks
          if (id.includes('/employee/')) {
            return 'employee'
          }
          
          // Composables chunk
          if (id.includes('/composables/')) {
            return 'composables'
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB (optional, for less warnings)
  },
})
