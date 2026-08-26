import type { Libro } from './tipos'
import { anadirLibro, buscarPorHash, pedirPermanencia } from './almacen'

/** SHA-256 del archivo entero: es lo que reconoce un PDF repetido (R24 / P37). */
async function huella(datos: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', datos)
  return Array.from(new Uint8Array(d))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Del nombre del archivo sale un título de partida. Casi siempre es un
 * desastre — guiones bajos, años, la web de donde salió — así que se limpia
 * lo obvio y ya lo corriges tú, que es lo que pediste en P42.
 */
export function tituloDesdeNombre(nombre: string): string {
  const limpio = nombre
    .replace(/\.pdf$/i, '')
    .replace(/[_+]+/g, ' ')
    .replace(/\s*[-–]\s*/g, ' — ')
    .replace(/\b(pdf|ebook|epub|scan|escaneado|www?\.[^\s]+|z-?lib(rary)?)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!limpio) return 'Sin título'
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

export type Resultado =
  | { estado: 'anadido'; libro: Libro }
  | { estado: 'repetido'; libro: Libro }
  | { estado: 'error'; motivo: string }

export async function importarPdf(archivo: File): Promise<Resultado> {
  try {
    const datos = await archivo.arrayBuffer()
    const hash = await huella(datos)

    // R24 / P37: avisar y no duplicar.
    const ya = await buscarPorHash(hash)
    if (ya) return { estado: 'repetido', libro: ya }

    // pdf.js se carga aquí y no arriba: si estuviera en el import de cabecera,
    // entraría en el paquete principal y la biblioteca cargaría medio mega de
    // más sin necesitarlo.
    const { Cuaderno } = await import('./pdf')
    // pdf.js se queda con el búfer que le pasas, así que va una copia.
    const paginas = await Cuaderno.contarPaginas(datos.slice(0))
    const ahora = Date.now()
    const id = crypto.randomUUID()

    const libro: Libro = {
      id,
      hash,
      titulo: tituloDesdeNombre(archivo.name),
      tipo: 'libro',
      etiquetas: [],
      paginas,
      bytes: archivo.size,
      archivo: `${id}.pdf`,
      anadidoEn: ahora,
      pagina: 1,
      abiertoEn: ahora,
    }

    await anadirLibro(libro, archivo)
    void pedirPermanencia()
    return { estado: 'anadido', libro }
  } catch (e) {
    const motivo = e instanceof Error ? e.message : 'no se pudo leer el archivo'
    return { estado: 'error', motivo }
  }
}
