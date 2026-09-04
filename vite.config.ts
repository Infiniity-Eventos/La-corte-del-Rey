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

/**
 * La fecha de compilación se puede fijar desde fuera.
 *
 * Sin eso, el paquete principal cambia de contenido —y de hash— en cada
 * compilación aunque el código sea idéntico, y no hay forma de comparar byte a
 * byte lo que sirve GitHub con lo que sale de aquí. `verificar.sh` lee la fecha
 * de lo publicado y recompila con ella.
 */
function cuando(): string {
  return process.env.COMPILADO ?? new Date().toISOString()
}

// Vellum se publica en dos sitios: en GitHub Pages vive en una subcarpeta con
// el nombre del repositorio, y en Firebase Hosting vivirá en la raíz. La ruta
// base se pasa desde fuera para que el mismo código sirva para los dos.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  build: {
    rollupOptions: {
      output: {
        /**
         * Firebase se reparte en trozos que el empaquetador llama «index.esm».
         * Con ese nombre no hay forma de ver en el navegador si se están
         * descargando, ni de comprobarlo en una prueba. Aquí se les pone
         * nombre, **manteniéndolos separados por partes**: entrar solo baja lo
         * de la sesión; lo de los datos y los archivos llega después, cuando
         * de verdad hace falta.
         */
        manualChunks(id) {
          // El paquete de verdad es el **último** «(@)firebase/loquesea» de la
          // ruta, no el primero: firebase anida copias suyas dentro de su
          // propio node_modules, y quedarse con la primera coincidencia metía
          // auth entero (450 kB) en el trozo común, que se descarga siempre.
          const cola = id.split(/node_modules[\\/]/).pop() ?? ''
          const m = /^(?:@firebase|firebase)[\\/]([^\\/]+)/.exec(cola)
          if (!m) return undefined
          const parte = m[1]
          if (parte === 'auth') return 'firebase-sesion'
          // webchannel-wrapper es el transporte de Firestore, de nadie más.
          if (parte === 'firestore' || parte === 'webchannel-wrapper') return 'firebase-datos'
          if (parte === 'storage') return 'firebase-archivos'
          return 'firebase-comun'
        },
      },
    },
  },
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
        /**
         * Recibir un PDF desde fuera, por los dos caminos que existen.
         *
         * En el teléfono, `share_target`: Vellum sale en el menú de Compartir.
         * Los archivos llegan en un POST que recoge el service worker, porque
         * aquí no hay servidor que lo reciba.
         *
         * En el escritorio, `file_handlers`: ahí sí se puede registrar «Abrir
         * con» para los .pdf, .cbz y .zip. En Android eso no existe para una app
         * web —solo para las instaladas de verdad— y por eso hacen falta las dos
         * cosas.
         */
        share_target: {
          action: `${base}compartir`,
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            /*
             * Los tres que se saben abrir, con todos los nombres que les da
             * Android. Un mismo zip llega como `application/zip`, como
             * `application/x-zip-compressed` o como `application/octet-stream`
             * según de qué app venga, y si su nombre no está en esta lista
             * Vellum no aparece en el menú de Compartir. Es preferible salir de
             * más —y explicar lo que no se puede abrir— a no salir cuando toca.
             */
            files: [{
              name: 'archivos',
              accept: [
                'application/pdf', '.pdf',
                'application/vnd.comicbook+zip', 'application/x-cbz', '.cbz',
                'application/zip', 'application/x-zip-compressed', '.zip',
                'application/octet-stream',
              ],
            }],
          },
        },
        file_handlers: [
          {
            action: base,
            accept: {
              'application/pdf': ['.pdf'],
              'application/vnd.comicbook+zip': ['.cbz'],
              'application/zip': ['.zip'],
            },
          },
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
        // El que recoge los PDF compartidos. Va aparte para no tener que
        // escribir a mano el service worker entero: la caché sin conexión que
        // genera el empaquetador costó dejarla bien y no se toca.
        importScripts: ['compartir-sw.js'],
        /*
         * El descompresor de RAR no entra en la caché de instalación.
         *
         * Son 600 KB de WebAssembly que solo hacen falta si traes un `.cbr`, y
         * meterlos ahí se los descargaría todo el mundo para nada. Se guardan
         * la primera vez que se usan, y a partir de ahí también sin conexión.
         */
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'vellum-descompresores',
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
