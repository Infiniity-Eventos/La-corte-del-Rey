import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * La versión es el commit del que salió esta compilación.
 *
 * No es un número que alguien tenga que acordarse de subir: cambia solo con
 * cada cambio, que es justo lo que hace falta para poder mirar la pantalla y
 * saber si lo que tienes delante es lo último.
 */
function version(): string {
  try {
    return execSync('git rev-parse --short=7 HEAD').toString().trim()
  } catch {
    // Fuera de un repositorio —una compilación suelta— aún queda lo que da CI.
    return (process.env.GITHUB_SHA ?? 'local').slice(0, 7)
  }
}

function cuando(): string {
  return new Date().toISOString()
}

// Vellum se publica en dos sitios: en GitHub Pages vive en una subcarpeta con
// el nombre del repositorio, y en Firebase Hosting vivirá en la raíz. La ruta
// base se pasa desde fuera para que el mismo código sirva para los dos.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  define: {
    __VERSION__: JSON.stringify(version()),
    __COMPILADO__: JSON.stringify(cuando()),
  },
  plugins: [
    react(),
    VitePWA({
      // El service worker nuevo toma el mando en cuanto se instala, sin pedir
      // permiso a nadie.
      //
      // Con 'prompt' se quedaba esperando a que la página le diera paso, y la
      // página que estaba corriendo era la vieja, que no sabe hacerlo: la
      // actualización se quedaba bloqueada para siempre. Con varias pestañas
      // abiertas, tampoco podía activarse por su cuenta.
      //
      // Quien decide cuándo recargar sigue siendo el lector: eso lo lleva la
      // app en src/lib/actualizacion.ts, no el service worker.
      registerType: 'autoUpdate',
      injectRegister: null,
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
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
})
