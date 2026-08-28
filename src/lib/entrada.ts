/**
 * Abrir un PDF desde fuera de la app.
 *
 * Hay dos caminos, y son distintos porque las plataformas son distintas:
 *
 * - **En el teléfono, «Compartir».** Android manda los archivos en un POST que
 *   recoge el service worker (`public/compartir-sw.js`), los deja en una caché y
 *   abre la app con `?compartidos=N`. Aquí se recogen de esa caché.
 * - **En la PC, «Abrir con».** El escritorio sí deja que una app instalada se
 *   registre para los .pdf, y entrega los archivos por `launchQueue`.
 *
 * Lo que **no** existe es «Abrir con → Vellum» en Android: eso solo lo tienen
 * las apps instaladas de verdad, con su declaración de tipos. Una app web no
 * puede, y por eso el camino ahí es Compartir.
 */

const BUZON = 'vellum-compartido'

/**
 * Los PDF que llegaron por «Compartir», si los hay.
 *
 * Se vacía el buzón al leerlo: si no, volver a abrir la app importaría otra vez
 * lo mismo, y la app avisaría de repetidos cada vez que la abres.
 */
export async function recogerCompartidos(): Promise<File[]> {
  if (!('caches' in self)) return []
  const marca = new URLSearchParams(location.search).get('compartidos')
  if (!marca) return []

  // La marca se quita de la barra de direcciones en cuanto se lee: si se queda,
  // recargar volvería a intentar recoger un buzón ya vacío.
  history.replaceState(history.state, '', location.pathname)

  try {
    const buzon = await caches.open(BUZON)
    const llaves = await buzon.keys()
    const archivos: File[] = []
    for (const llave of llaves) {
      const r = await buzon.match(llave)
      if (!r) continue
      const nombre = decodeURIComponent(r.headers.get('X-Nombre') ?? 'compartido.pdf')
      archivos.push(new File([await r.blob()], nombre, { type: 'application/pdf' }))
    }
    await caches.delete(BUZON)
    return archivos
  } catch {
    return []
  }
}

interface Lanzamiento {
  files?: { getFile: () => Promise<File> }[]
}

/**
 * Los PDF que llegan por «Abrir con» en el escritorio.
 *
 * `launchQueue` solo existe en Chrome de escritorio; en el teléfono no está y
 * esto no hace nada, que es exactamente lo correcto.
 */
export function escucharAperturas(alLlegar: (archivos: File[]) => void): void {
  const cola = (window as unknown as {
    launchQueue?: { setConsumer: (f: (p: Lanzamiento) => void) => void }
  }).launchQueue
  if (!cola) return

  cola.setConsumer(params => {
    if (!params.files?.length) return
    void Promise.all(params.files.map(h => h.getFile())).then(fs => {
      if (fs.length) alLlegar(fs)
    })
  })
}
