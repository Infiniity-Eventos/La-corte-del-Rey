import type { Libro } from './tipos'
import { anadirLibro, buscarPorHash, pedirPermanencia } from './almacen'
import { contarPaginas, formatoDe } from './cuaderno'
import type { Formato } from './cuaderno'
import { ErrorZip, esBasura, extension, listar, pareceZip, sacar } from './zip'

/**
 * Traer libros de fuera.
 *
 * Entra un PDF, un CBZ o **un zip con varios dentro**, que es como llegan las
 * colecciones de verdad: nadie descarga doce números de uno en uno. Un zip se
 * abre, se mira qué hay dentro y entra todo lo que sirva; lo demás —los `.txt`,
 * las carpetas de macOS— se ignora sin decir nada, porque no es un problema.
 */

/** SHA-256 del archivo entero: es lo que reconoce un repetido (R24 / P37). */
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
    .replace(/\.(pdf|cbz|zip)$/i, '')
    .replace(/[_+]+/g, ' ')
    .replace(/\s*[-–]\s*/g, ' — ')
    .replace(/\b(pdf|cbz|ebook|epub|scan|escaneado|www?\.[^\s]+|z-?lib(rary)?)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!limpio) return 'Sin título'
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

/** Lo que se sabe abrir. El resto de lo que haya en un zip no molesta a nadie. */
const SIRVE = /^(pdf|cbz)$/
const ES_CAJA = /^zip$/
/**
 * El CBR no entra, y hay que decirlo aparte.
 *
 * Un CBR es lo mismo que un CBZ pero comprimido con RAR, que es un formato
 * cerrado y no viene en ningún navegador. Sin este aviso, un `.cbr` acabaría en
 * pdf.js dando un error que no explica nada.
 */
const ES_RAR = /^cbr$/
const AVISO_RAR = 'los CBR van en RAR, que no se puede abrir aquí. Convertido a CBZ entra sin problema'

/**
 * La carpeta que comparten todos, si comparten alguna.
 *
 * Un zip de una colección casi siempre trae una carpeta con el nombre de la
 * obra y los tomos dentro. Ese nombre es mejor que el del archivo comprimido,
 * que suele venir con la web de donde salió pegada detrás.
 */
export function carpetaComun(nombres: string[]): string | null {
  if (nombres.length < 2) return null
  const primera = nombres[0].includes('/') ? nombres[0].split('/')[0] : null
  if (!primera) return null
  return nombres.every(n => n.split('/')[0] === primera) ? primera : null
}

export type Resultado =
  | { estado: 'anadido'; libro: Libro }
  | { estado: 'repetido'; libro: Libro }
  | { estado: 'error'; nombre: string; motivo: string }

/** Por dónde va la importación, para poder contarlo mientras dura. */
export interface Marcha {
  hecho: number
  total: number
  nombre: string
}

/**
 * Un archivo suelto, ya sea traído a mano o sacado de un zip.
 *
 * `extras` es lo que sabe quien lo llama y el archivo no dice: de qué serie es
 * y qué puesto ocupa. Sale de la carpeta en la que venía.
 */
async function meter(
  datos: ArrayBuffer,
  nombre: string,
  extras: Partial<Libro> = {},
): Promise<Resultado> {
  try {
    const hash = await huella(datos)
    // R24 / P37: avisar y no duplicar.
    const ya = await buscarPorHash(hash)
    if (ya) return { estado: 'repetido', libro: ya }

    const formato: Formato = formatoDe(nombre)
    // pdf.js se queda con el búfer que le pasas, así que va una copia; el CBZ
    // solo lo lee, y copiar trescientos megas para nada sí se nota.
    const paginas = await contarPaginas(formato === 'pdf' ? datos.slice(0) : datos, formato)
    if (paginas === 0) throw new Error('no tiene ninguna página')

    const ahora = Date.now()
    const id = crypto.randomUUID()
    const libro: Libro = {
      id,
      hash,
      titulo: tituloDesdeNombre(nombre.split('/').pop() ?? nombre),
      // Un CBZ es un cómic por definición: nadie guarda una novela en imágenes.
      tipo: formato === 'cbz' ? 'comic' : 'libro',
      formato,
      etiquetas: [],
      paginas,
      bytes: datos.byteLength,
      archivo: `${id}.${formato}`,
      nombreOriginal: nombre,
      // Lo que traes tú nace en tu estantería: si lo subiste, lo querías.
      estrella: true,
      anadidoEn: ahora,
      pagina: 1,
      abiertoEn: ahora,
      ...extras,
    }

    await anadirLibro(libro, new Blob([datos]))
    void pedirPermanencia()
    return { estado: 'anadido', libro }
  } catch (e) {
    const motivo = e instanceof Error ? e.message : 'no se pudo leer el archivo'
    return { estado: 'error', nombre, motivo }
  }
}

/**
 * Si el archivo empieza por `%PDF`.
 *
 * Se mira el principio y no la extensión porque el selector de archivos del
 * teléfono ya no filtra nada: ahí se ve todo, y con todo se puede elegir una
 * foto por error. Vale más una frase que lo diga que el error crudo de pdf.js.
 *
 * Se busca en el primer kilobyte y no en el byte cero: hay PDF con basura
 * delante, y pdf.js los abre igual.
 */
function parecePdf(datos: ArrayBuffer): boolean {
  const cabeza = new Uint8Array(datos, 0, Math.min(1024, datos.byteLength))
  for (let i = 0; i + 4 <= cabeza.length; i++) {
    if (cabeza[i] === 0x25 && cabeza[i + 1] === 0x50 && cabeza[i + 2] === 0x44 && cabeza[i + 3] === 0x46) return true
  }
  return false
}

/** Cuántas cajas dentro de cajas se abren. Más que esto ya es alguien jugando. */
const FONDO = 3

/**
 * Abrir un zip y meter todo lo que traiga dentro.
 *
 * El orden importa: se meten por nombre, comparado como lo compararía una
 * persona, para que el 2 vaya antes que el 10 y la serie quede derecha desde el
 * primer momento.
 */
async function abrirCaja(
  datos: ArrayBuffer,
  nombreCaja: string,
  avisar: ((m: Marcha) => void) | undefined,
  contador: { hecho: number; total: number },
  fondo: number,
): Promise<Resultado[]> {
  let dentro
  try {
    dentro = listar(datos)
  } catch (e) {
    return [{ estado: 'error', nombre: nombreCaja, motivo: e instanceof ErrorZip ? e.message : 'no se pudo abrir' }]
  }

  const utiles = dentro
    .filter(e => !esBasura(e.nombre) && e.tamano > 0)
    .filter(e => SIRVE.test(extension(e.nombre)) || (fondo > 0 && ES_CAJA.test(extension(e.nombre))))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true, sensitivity: 'base' }))

  if (utiles.length === 0) {
    const hayRar = dentro.some(e => ES_RAR.test(extension(e.nombre)))
    return [{
      estado: 'error',
      nombre: nombreCaja,
      motivo: hayRar ? AVISO_RAR : 'no hay ningún PDF ni CBZ dentro',
    }]
  }

  // La serie se decide antes de meter nada: es la carpeta que comparten todos
  // o, si no la hay, el nombre del propio zip. Con un solo libro dentro no hay
  // serie que valga — una serie de uno es solo un libro.
  const serie = utiles.length > 1
    ? carpetaComun(utiles.map(e => e.nombre)) ?? tituloDesdeNombre(nombreCaja)
    : undefined

  contador.total += utiles.length - 1
  const salida: Resultado[] = []
  let puesto = 0

  for (const entrada of utiles) {
    avisar?.({ hecho: contador.hecho, total: contador.total, nombre: entrada.nombre.split('/').pop() ?? entrada.nombre })
    try {
      const bytes = await sacar(datos, entrada)
      const trozo = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
      if (ES_CAJA.test(extension(entrada.nombre))) {
        salida.push(...(await abrirCaja(trozo, entrada.nombre, avisar, contador, fondo - 1)))
      } else {
        salida.push(await meter(trozo, entrada.nombre, serie ? { serie, orden: puesto++ } : {}))
      }
    } catch (e) {
      salida.push({
        estado: 'error',
        nombre: entrada.nombre,
        motivo: e instanceof ErrorZip ? e.message : 'no se pudo sacar del zip',
      })
    }
    contador.hecho++
  }
  return salida
}

/**
 * La puerta de entrada. Acepta un PDF, un CBZ o un zip con varios dentro, y
 * devuelve una lista porque un solo archivo puede traer doce libros.
 */
export async function importar(archivo: File, avisar?: (m: Marcha) => void): Promise<Resultado[]> {
  let datos: ArrayBuffer
  try {
    datos = await archivo.arrayBuffer()
  } catch {
    return [{ estado: 'error', nombre: archivo.name, motivo: 'no se pudo leer el archivo' }]
  }

  const ext = extension(archivo.name)
  if (ES_RAR.test(ext)) return [{ estado: 'error', nombre: archivo.name, motivo: AVISO_RAR }]
  // Un `.cbz` también es un zip, y aquí es donde se decide que uno es un cómic
  // y el otro una caja con cómics. Un zip sin extensión reconocible se mira por
  // dentro: alguien que comparte por WhatsApp pierde el nombre a menudo.
  const esCaja = ES_CAJA.test(ext) || (!SIRVE.test(ext) && pareceZip(datos))

  const contador = { hecho: 0, total: 1 }
  if (esCaja) return abrirCaja(datos, archivo.name, avisar, contador, FONDO)

  // Un `.cbz` no lleva `%PDF` dentro y aquí es de los buenos, así que la
  // comprobación solo vale para lo que ni siquiera dice ser un libro.
  if (!SIRVE.test(ext) && !parecePdf(datos)) {
    return [{
      estado: 'error',
      nombre: archivo.name,
      motivo: 'no es un PDF ni un cómic. Entran PDF, CBZ y zips con eso dentro',
    }]
  }

  avisar?.({ hecho: 0, total: 1, nombre: archivo.name })
  return [await meter(datos, archivo.name)]
}
