import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Secret Santa - Amigo Secreto',
        short_name: 'Secret Santa',
        description: 'A complete web application for managing Secret Santa groups',
        theme_color: '#135F5C',
        background_color: '#FFF8F0',
        display: 'standalone',
        orientation: 'portrait',
        prefer_related_applications: false,
        icons: [
          {
            src: '/src/assets/img/logo_64.png',
            sizes: '64x64',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/src/assets/img/logo_128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/src/assets/img/logo_256.png',
            sizes: '256x256',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/src/assets/img/logo_512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Import custom push notification handlers
        importScripts: ['/sw-custom.js'],
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

