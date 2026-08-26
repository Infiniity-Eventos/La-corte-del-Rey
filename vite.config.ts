import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Infiniity Vellum',
        short_name: 'Vellum',
        description: 'Lector de PDF con traductor',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#EDE6D6',
        theme_color: '#EDE6D6',
        // Provisional hasta que lleguen los PNG generados (P79). Chrome acepta
        // SVG como icono de manifiesto, así que la app ya es instalable.
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: {
        // El worker de pdf.js es un .mjs de 1,4 MB. Sin incluir la extensión y
        // sin subir el tope, se queda fuera de la caché en silencio y la app
        // deja de abrir libros en cuanto no hay red.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
})
