import { crc32, escribir } from './zip'
import type { Aporte } from './zip'

/**
 * Los cómics en CBR, que por dentro son RAR.
 *
 * RAR es un formato cerrado: no viene en ningún navegador y no se puede leer
 * escribiendo doscientas líneas, como el zip. Hace falta un descompresor de
 * verdad, y aquí se usa **libarchive compilado a WebAssembly** (MIT).
 *
 * Es la única dependencia de la app para un formato, y entra con dos
 * condiciones que la hacen aceptable:
 *
 * 1. **Solo se descarga al abrir un `.cbr`.** Son 600 KB de WebAssembly que
 *    quien no tenga ninguno no baja nunca — ni siquiera están en la caché sin
 *    conexión hasta que hacen falta una vez.
 * 2. **Se usa una sola vez por tomo.** El CBR se convierte a CBZ al traerlo y
 *    se guarda ya convertido. Leerlo después es leer un zip, con todo lo que
 *    eso trae: las páginas se sacan de una en una y sin descomprimir nada.
 *
 * Lo que **no** se puede hacer es lo que se hace con el zip: leer solo un
 * trozo. RAR se descomprime en cadena, así que el tomo entero pasa por memoria
 * una vez. Por eso esto vive en un hilo aparte: con doscientos megas dentro, si
 * algo sale mal se muere el hilo y no la app, y mientras tanto se puede seguir
 * leyendo.
 */

/** Lo que se considera una página. Lo demás —ComicInfo.xml— no entra. */
const IMAGENES = /^(jpe?g|png|webp|gif|avif|bmp)$/

function extensionDe(nombre: string): string {
  const hoja = nombre.split('/').pop() ?? ''
  const punto = hoja.lastIndexOf('.')
  return punto > 0 ? hoja.slice(punto + 1).toLowerCase() : ''
}

export function esPagina(nombre: string): boolean {
  const hoja = nombre.split('/').pop() ?? ''
  return !hoja.startsWith('.') && !nombre.startsWith('__MACOSX/') && IMAGENES.test(extensionDe(nombre))
}

/**
 * De las páginas sueltas a un cómic.
 *
 * Se ordenan como las ordenaría una persona —el 2 antes que el 10— porque en un
 * RAR el orden tampoco está escrito en ninguna parte: lo pone el nombre. Es la
 * misma regla que en el CBZ (D-39) y en los números de una serie (D-36).
 */
export function armarCbz(paginas: Aporte[]): Blob {
  const orden = [...paginas].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { numeric: true, sensitivity: 'base' }),
  )
  return escribir(orden)
}

/** El aporte de una página, con su cuenta ya hecha mientras está en la mano. */
export function paginaSuelta(nombre: string, datos: Uint8Array): Aporte {
  return {
    nombre,
    // Se guarda como Blob en cuanto se puede: así el navegador se lleva los
    // bytes fuera del montón de JavaScript y un tomo de doscientas páginas no
    // se acumula entero en memoria.
    datos: new Blob([datos as BufferSource]),
    crc: crc32(datos),
    tamano: datos.length,
  }
}

export type Respuesta =
  | { ok: true; cbz: Blob; paginas: number }
  | { ok: false; motivo: string }

/**
 * Convertir un CBR en un CBZ, en un hilo aparte.
 *
 * El hilo se crea, hace su trabajo y se cierra. Mantenerlo vivo entre tomos
 * ahorraría volver a cargar el WebAssembly, pero también dejaría doscientos
 * megas de memoria retenidos entre uno y otro, que es lo caro de los dos.
 */
export function convertirCbr(archivo: Blob): Promise<Respuesta> {
  return new Promise(listo => {
    let obrero: Worker
    try {
      obrero = new Worker(new URL('./obrero-rar.ts', import.meta.url), { type: 'module' })
    } catch {
      listo({ ok: false, motivo: 'este navegador no puede convertirlo' })
      return
    }

    const acabar = (r: Respuesta) => {
      obrero.terminate()
      listo(r)
    }
    obrero.onmessage = e => acabar(e.data as Respuesta)
    // Si el hilo se muere —y con un tomo enorme puede pasar— hay que contarlo,
    // no dejar la importación esperando para siempre.
    obrero.onerror = () => acabar({ ok: false, motivo: 'no se pudo convertir: es demasiado grande para este aparato' })
    obrero.postMessage({ archivo })
  })
}
