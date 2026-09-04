/// <reference lib="webworker" />
import { ArchiveReader, libarchiveWasm } from 'libarchive-wasm'
import wasmUrl from 'libarchive-wasm/dist/libarchive.wasm?url'
import { armarCbz, esPagina, paginaSuelta } from './rar'
import type { Aporte } from './zip'

/**
 * El hilo que convierte un CBR en un CBZ.
 *
 * Vive aparte por dos razones y las dos importan con un tomo de trescientos
 * megas: **la app no se congela** mientras se descomprime, y si la memoria no
 * llega se muere este hilo y no la pestaña entera.
 *
 * Aquí dentro no hay nada de la app: entra un archivo, sale un cómic o un
 * motivo por el que no.
 */

self.onmessage = async (e: MessageEvent<{ archivo: Blob }>) => {
  try {
    const modulo = await libarchiveWasm({ locateFile: () => wasmUrl })

    // La única vez que el tomo entero pasa por memoria. El constructor lo copia
    // al montón del descompresor, así que en cuanto vuelve se suelta esta
    // referencia: dos copias de trescientos megas a la vez no caben en un
    // teléfono.
    let crudo: Int8Array | null = new Int8Array(await e.data.archivo.arrayBuffer())
    const lector = new ArchiveReader(modulo, crudo)
    crudo = null

    const paginas: Aporte[] = []
    try {
      for (const entrada of lector.entries()) {
        const nombre = entrada.getPathname()
        if (!esPagina(nombre)) {
          entrada.skipData()
          continue
        }
        const datos = entrada.readData()
        if (datos && datos.length > 0) {
          paginas.push(paginaSuelta(nombre, new Uint8Array(datos.buffer, datos.byteOffset, datos.byteLength)))
        }
      }
    } finally {
      lector.free()
    }

    if (paginas.length === 0) {
      self.postMessage({ ok: false, motivo: 'el CBR no tiene ninguna imagen dentro' })
      return
    }
    self.postMessage({ ok: true, cbz: armarCbz(paginas), paginas: paginas.length })
  } catch (error) {
    const motivo = error instanceof Error ? error.message : 'no se pudo convertir'
    self.postMessage({ ok: false, motivo })
  }
}
