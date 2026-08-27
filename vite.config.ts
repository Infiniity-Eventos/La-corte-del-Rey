import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Vellum se publica en dos sitios: en GitHub Pages vive en una subcarpeta con
// el nombre del repositorio, y en Firebase Hosting vivirá en la raíz. La ruta
// base se pasa desde fuera para que el mismo código sirva para los dos.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Infiniity Vellum',
        short_name: 'Vellum',
        description: 'Lector de PDF con traductor',
        lang: 'es',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#EDE6D6',
        theme_color: '#EDE6D6',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          // El «maskable» lleva más margen a propósito: Android recorta hasta un
          // 20 % por lado para encajarlo en la forma del sistema, y con el
          // recorte del normal se comería la vitela.
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
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
