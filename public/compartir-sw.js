/* eslint-disable no-undef */
/**
 * Recibir PDF desde el menú «Compartir» de Android.
 *
 * Android manda los archivos como un POST con formulario, y **un POST no puede
 * llegar a una app que son archivos estáticos**: no hay servidor que lo reciba.
 * Lo recoge el service worker, guarda los archivos donde la app pueda leerlos y
 * la abre con un aviso en la dirección.
 *
 * Va en un archivo aparte, cargado con `importScripts`, para no tener que
 * escribir a mano el service worker entero: el que genera el empaquetador ya
 * hace la caché sin conexión, y esa parte costó bastante dejarla bien.
 *
 * Workbox no toca los POST, así que los dos escuchan sin estorbarse.
 */

const BUZON = 'vellum-compartido'

self.addEventListener('fetch', evento => {
  const pedido = evento.request
  if (pedido.method !== 'POST') return

  const destino = new URL(self.registration.scope + 'compartir')
  const url = new URL(pedido.url)
  if (url.origin !== destino.origin || url.pathname !== destino.pathname) return

  evento.respondWith(
    (async () => {
      try {
        const form = await pedido.formData()
        const archivos = form.getAll('archivos').filter(a => a && a.size > 0)

        const buzon = await caches.open(BUZON)
        // Se vacía antes: si algo quedó de una vez anterior que no llegó a
        // abrirse, aparecería mezclado con lo de ahora.
        for (const k of await buzon.keys()) await buzon.delete(k)

        for (let i = 0; i < archivos.length; i++) {
          const a = archivos[i]
          await buzon.put(
            new Request(`${self.registration.scope}compartido/${i}`),
            // El nombre no viaja en el cuerpo, así que va en una cabecera: sin
            // él el libro entraría llamándose «compartido/0».
            new Response(a, {
              headers: {
                'Content-Type': a.type || 'application/pdf',
                'X-Nombre': encodeURIComponent(a.name || `compartido-${i}.pdf`),
              },
            }),
          )
        }

        // 303 y no 302: así el navegador cambia el POST por un GET y recargar
        // la página no vuelve a mandar los archivos.
        return Response.redirect(`${self.registration.scope}?compartidos=${archivos.length}`, 303)
      } catch {
        // Si algo sale mal, la app se abre igual y vacía. Quedarse en una
        // pantalla de error del navegador sería peor.
        return Response.redirect(self.registration.scope, 303)
      }
    })(),
  )
})
